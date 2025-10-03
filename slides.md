# Tamper-Evident Ledger Systems (TELS)

A technology-neutral framework to improve SB 1330

---

## Why This Matters (Executive Summary)

- Make corruption visible, traceable, punishable, preventable
- Hybrid: databases for data; ledger for proof (hashes)
- Real-time COA oversight; citizen dashboards
- Phased pilot; tech-neutral; privacy-compliant

Notes:
- Focus on outcomes. Ledger = proof, not storage.

---

## Objectives & Scope

- Objectives: trace every peso end-to-end; real-time oversight; citizen-usable transparency; deterrence
- Scope: DBM (appropriations/allotments), PhilGEPS (procurement), Agencies (IAR/Billing/OBR/DV), BTr (cash release), COA (audit)
- Out of scope: storing raw documents on-chain; foreign-controlled public chains for core records

---

## The Problem (Today)

- Opaque amendments; late audits; editable logs
- PDFs, manual workflows; poor citizen usability
- Myth: “put everything on blockchain” (slow, costly, privacy conflicts)

Notes:
- Emphasize delays and editability as root causes.

---

## Design Principles

- Proof ≠ Storage (hash-only anchoring)
- Technology Neutral (TELS: blockchain/DLT/DAG/append-only logs)
- Data Privacy First (DB corrections + new hash on chain)
- Citizen-Usable Transparency (plain language, multilingual)

---

## What We Change in SB 1330

- Replace blockchain-only with TELS (tech-neutral outcomes)
- Immutable amendment logging with signatures
- COA real-time access; quarterly independent audits
- RA 9346-compliant penalties; FOI/RA 11032 transparency

---

## Architecture (Hybrid Model)

```
DATA LAYER (DBs) → VERIFICATION (TELS: hashes/signatures) → TRANSPARENCY (APIs/Dashboards)
```

- Systems retain full data; TELS stores hashes/signers/timestamps
- Dashboards/APIs for citizens, COA, media

---

## Agencies & Standards

- DBM: Appropriations, Allotments, NCA (UACS)
- PhilGEPS: OCDS Planning/Tender/Award/Contract
- Agencies: IAR, Billing, OBR/DV (PNPKI-signed)
- BTr: Cash releases & disbursements
- COA: Real-time audit analytics

---

## Traceability (End-to-End)

- `telsTraceId` links all events
- `ocid` (OCDS) for procurement
- `uacsCode` for accounting classification
- Document hashes verified in TELS

ASCII Map:
```
Appropriation → Allotment → Tender → Award → Contract → Delivery → Billing → OBR/DV → Cash Release
           \_______________________ telsTraceId _________________________/
```

---

## Data Structures (Examples)

- Procurement (OCDS): ocid, value.amount, suppliers[], documents[].hash
- Disbursement: OBR (uacsCode, amount), DV (amountNet, attachments), CashRelease (ncaId, bankRef)
- Signatures: PNPKI cert metadata + signature; hash anchored in TELS

---

## Process & SLAs

- Submission → Validation (≤2 days) → Commit (≤1 hour)
- Correction (≤10 days): update in DB; anchor new hash
- Auto-flag non-compliance to COA + Oversight

---

## Cost-Benefit (How We Compute)

- Hash-only + local nodes → no public gas fees
- Object storage benchmark (USD 0.023/GB-month) for docs
- Formulas in README; replace with DBM/DICT actuals

Notes:
- Show EIP-2028 math for public chain storage as contrast.

---

## Security & Governance

- Ledger SOC; 5+ validator nodes (DICT, COA, DBM, academe, auditor)
- HSM key management; PNPKI-qualified signing
- DR: RTO 4h / RPO 15m; red-team and audits

---

## Data Sovereignty & Residency

- Operate on PH-jurisdiction infrastructure; permissioned, locally governed nodes
- Keep full records in government databases; anchor hashes to a state-governed ledger
- Enforce DICT Cloud First residency; disclose third-party dependencies; maintain exit plans

---

## KPIs (What Success Looks Like)

- Transparency coverage (% lines with hashes)
- Timeliness (submission→commit)
- Correction SLA compliance
- Audit lead time; anomalies ↓ YoY

---

## Roadmap & Rollout

- 0–6 mo: legal/standards, infra, pilot setup
- 7–30 mo: DBM, DPWH, 3 LGUs pilot; dashboards; COA live
- 31–36 mo: independent evaluation; national scale

---

## The Ask

- Adopt TELS amendments to SB 1330
- Approve 2-year pilot + oversight reporting
- Mandate PNPKI signatures; fund Ledger SOC + dashboards

---

## References

- Laws: RA 10173, RA 8792, RA 9346, RA 9184, RA 3019, RA 11032, PD 1445, EO 2 (2016)
- Standards: UACS JC 2013-1, OCDS, PNPKI, DICT Cloud First, NCP 2022
- See README References for links

---

## Backup (Appendix)

- Sample JSONs (BudgetItem, DV, CashRelease)
- Verify-hash API example
- Traceability keys and joins

Notes:
- Use appendix for Q&A. Show verify-hash flow if asked.
