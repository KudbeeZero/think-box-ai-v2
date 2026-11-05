"""Safety gates for CNC manufacturing.

Every job must pass a SafetyGate and hold an APPROVED ApprovalGate before the
engine will execute it. Execution is opt-in: a job with no approval record is
blocked, never executed. This module is the enforcement point for the
"no autonomous execution" principle in AGENTS.md.

The store is append-only for approvals: once a gate is approved it is persisted
to disk and cannot be mutated in place. Emergency stop records a new state on
the in-memory record only (the persisted artifact keeps the approval as the
audit trail).
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any


class ApprovalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EMERGENCY_STOP = "EMERGENCY_STOP"


@dataclass
class ApprovalGate:
    gate_id: str = ""
    job_id: str = ""
    status: ApprovalStatus = ApprovalStatus.PENDING
    approver_id: str = ""
    reason: str = ""
    timestamp: str = ""

    def __post_init__(self) -> None:
        if not self.gate_id:
            self.gate_id = f"gate-{uuid.uuid4().hex[:8]}"
        if not self.timestamp:
            self.timestamp = datetime.now(timezone.utc).isoformat()

    def model_dump(self) -> dict[str, Any]:
        return {"gate_id": self.gate_id, "job_id": self.job_id, "status": self.status.value,
                "approver_id": self.approver_id, "reason": self.reason, "timestamp": self.timestamp}


@dataclass
class SafetyGate:
    gate_id: str = ""
    job_id: str = ""
    requires_approval: bool = True
    is_safe: bool = True
    issues: list[str] = field(default_factory=list)
    checks_passed: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.gate_id:
            self.gate_id = f"sg-{uuid.uuid4().hex[:8]}"

    def check_safety(self) -> "SafetyGate":
        self.is_safe = len(self.issues) == 0
        return self

    def model_dump(self) -> dict[str, Any]:
        return {"gate_id": self.gate_id, "job_id": self.job_id, "requires_approval": self.requires_approval,
                "is_safe": self.is_safe, "issues": self.issues, "checks_passed": self.checks_passed}


class SafetyGateStore:
    """Append-only store of ApprovalGates, persisted one gate per JSON file.

    Approvals are append-only: a gate that has been approved is written to disk
    and its on-disk record is never mutated. Emergency stop flips the in-memory
    status so in-flight checks see it, while the persisted artifact remains the
    audit trail of the original approval.
    """

    def __init__(self, storage_path: str = "data/cnc/safety") -> None:
        self.storage_path = Path(storage_path)
        self._gates: list[ApprovalGate] = []
        self._load()

    # -- persistence --------------------------------------------------------

    def _load(self) -> None:
        if not self.storage_path.exists():
            return
        for f in sorted(self.storage_path.glob("*.json")):
            try:
                data = json.loads(f.read_text())
                gate = ApprovalGate(**data)
                self._gates.append(gate)
            except (json.JSONDecodeError, TypeError, ValueError):
                # Corrupt or foreign file: skip, do not abort the store.
                continue

    def _save(self, gate: ApprovalGate) -> None:
        self.storage_path.mkdir(parents=True, exist_ok=True)
        f = self.storage_path / f"{gate.gate_id}.json"
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(json.dumps(gate.model_dump(), indent=2))

    # -- write operations (append-only) ------------------------------------

    def approve(self, job_id: str, approver_id: str, reason: str = "") -> ApprovalGate:
        """Record an APPROVED gate for job_id. Append-only: never overwrites."""
        gate = ApprovalGate(job_id=job_id, approver_id=approver_id, reason=reason,
                            status=ApprovalStatus.APPROVED)
        self._gates.append(gate)
        self._save(gate)
        return gate

    def reject(self, job_id: str, approver_id: str, reason: str = "") -> ApprovalGate:
        """Record a REJECTED gate for job_id. The engine blocks on this too."""
        gate = ApprovalGate(job_id=job_id, approver_id=approver_id, reason=reason,
                            status=ApprovalStatus.REJECTED)
        self._gates.append(gate)
        self._save(gate)
        return gate

    def emergency_stop(self, job_id: str = "all") -> list[ApprovalGate]:
        """Flip in-memory gates to EMERGENCY_STOP. Persisted records are untouched."""
        stopped: list[ApprovalGate] = []
        for gate in self._gates:
            if job_id == "all" or gate.job_id == job_id:
                gate.status = ApprovalStatus.EMERGENCY_STOP
                stopped.append(gate)
        return stopped

    # -- read operations ----------------------------------------------------

    def list_gates(self) -> list[ApprovalGate]:
        return list(self._gates)

    def get_gate(self, gate_id: str) -> ApprovalGate | None:
        for g in self._gates:
            if g.gate_id == gate_id:
                return g
        return None

    def get_gate_by_job_id(self, job_id: str) -> ApprovalGate | None:
        """Most recent gate for job_id. The engine consults this before executing."""
        match: ApprovalGate | None = None
        for g in self._gates:
            if g.job_id == job_id:
                match = g  # last write wins
        return match

    def is_job_approved(self, job_id: str) -> bool:
        """True only when the most recent gate for job_id is APPROVED.

        PENDING, REJECTED, and EMERGENCY_STOP all block execution. A job with no
        gate at all is blocked (fail-closed).
        """
        gate = self.get_gate_by_job_id(job_id)
        if gate is None:
            return False
        return gate.status == ApprovalStatus.APPROVED