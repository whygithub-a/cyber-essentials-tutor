import json
import os
from typing import Optional

from fastapi import APIRouter, HTTPException
from openai import AzureOpenAI, OpenAI
from pydantic import BaseModel, Field

from app.core.azure_openai import create_embedding
from app.core.supabase_client import supabase

router = APIRouter(prefix="/api/consultation", tags=["consultation"])


DISCLAIMER = (
    "This summary is generated for learning and Cyber Essentials readiness "
    "preparation only. It is not an official Cyber Essentials assessment, "
    "audit result, certification decision, or professional compliance advice."
)


class ConsultationRequest(BaseModel):
    session_id: Optional[str] = None

    organisation_size: str
    it_management: str

    devices: list[str] = Field(default_factory=list)
    cloud_services: list[str] = Field(default_factory=list)

    firewall_protection: str
    firewall_passwords_rules: str

    unnecessary_software_accounts: str
    device_locking: str

    supported_software: str
    critical_updates_14_days: str

    unique_accounts: str
    admin_account_separation: str
    cloud_mfa: str

    malware_protection: list[str] = Field(default_factory=list)
    malware_updated_blocking: str

    additional_context: str = ""


class ConsultationHelpMessage(BaseModel):
    role: str
    content: str


class ConsultationFieldHelpRequest(BaseModel):
    field_id: str
    field_title: str
    field_question: str
    static_explanation: str
    current_answer: str = ""
    user_follow_up: str
    recent_messages: list[ConsultationHelpMessage] = Field(default_factory=list)


class ConsultationFieldHelpResponse(BaseModel):
    answer: str


class ConsultationGap(BaseModel):
    control: str
    severity: str
    issue: str
    why_it_matters: str
    recommended_action: str
    related_reference: str
    evidence_from_user: str


class ConsultationStrength(BaseModel):
    control: str
    point: str


class ConsultationSource(BaseModel):
    id: str
    topic_id: Optional[str] = None
    section_title: Optional[str] = None
    page_number: Optional[int] = None
    similarity: Optional[float] = None
    content_preview: str


class ConsultationResponse(BaseModel):
    overall_readiness: str
    summary: str
    strengths: list[ConsultationStrength]
    potential_gaps: list[ConsultationGap]
    clarification_questions: list[str]
    recommended_next_steps: list[str]
    sources: list[ConsultationSource]
    disclaimer: str


def normalise(value: str | None) -> str:
    if value is None:
        return ""

    return value.strip().lower()


def contains_any(value: str, terms: list[str]) -> bool:
    lowered = normalise(value)

    return any(term in lowered for term in terms)


def list_contains_any(values: list[str], terms: list[str]) -> bool:
    lowered_values = [normalise(value) for value in values]

    for value in lowered_values:
        for term in terms:
            if term in value:
                return True

    return False


def add_gap(
    gaps: list[ConsultationGap],
    control: str,
    severity: str,
    issue: str,
    why_it_matters: str,
    recommended_action: str,
    related_reference: str,
    evidence_from_user: str,
) -> None:
    gaps.append(
        ConsultationGap(
            control=control,
            severity=severity,
            issue=issue,
            why_it_matters=why_it_matters,
            recommended_action=recommended_action,
            related_reference=related_reference,
            evidence_from_user=evidence_from_user,
        )
    )


def add_strength(
    strengths: list[ConsultationStrength],
    control: str,
    point: str,
) -> None:
    strengths.append(
        ConsultationStrength(
            control=control,
            point=point,
        )
    )


def context_contains_negative_uncertainty(context: str) -> bool:
    return any(
        marker in context
        for marker in [
            "not sure",
            "unknown",
            "unclear",
            "do not know",
            "don't know",
            "not confirmed",
        ]
    )


def context_confirms_cloud_mfa(context: str) -> bool:
    if "mfa" not in context and "multi-factor" not in context:
        return False

    if context_contains_negative_uncertainty(context):
        return False

    has_all_users = any(
        marker in context
        for marker in [
            "all users",
            "all staff",
            "everyone",
            "normal users",
            "standard users",
        ]
    )

    has_admins = "admin" in context or "administrator" in context

    has_positive = any(
        marker in context
        for marker in [
            "enabled",
            "applied",
            "turned on",
            "configured",
            "required",
        ]
    )

    return has_all_users and has_admins and has_positive


def context_confirms_updates_14_days(context: str) -> bool:
    if context_contains_negative_uncertainty(context):
        return False

    has_update = "update" in context or "patch" in context
    has_14_days = "14 days" in context or "within 14" in context
    has_positive = any(
        marker in context
        for marker in [
            "applied",
            "installed",
            "managed",
            "checked",
            "automatic",
            "auto update",
            "auto-updates",
        ]
    )

    return has_update and has_14_days and has_positive


def context_confirms_unique_accounts(context: str) -> bool:
    if context_contains_negative_uncertainty(context):
        return False

    return any(
        marker in context
        for marker in [
            "no shared accounts",
            "no shared account",
            "each user has their own account",
            "every user has their own account",
            "unique accounts",
            "unique credentials",
            "named accounts",
        ]
    )


def context_confirms_admin_separation(context: str) -> bool:
    if context_contains_negative_uncertainty(context):
        return False

    has_admin = "admin" in context or "administrator" in context
    has_separate = "separate" in context or "separated" in context
    has_daily_negative = any(
        marker in context
        for marker in [
            "not used for email",
            "not used for web",
            "not used for browsing",
            "only used for admin",
            "only used for administrative",
        ]
    )

    return has_admin and (has_separate or has_daily_negative)


def context_confirms_supported_software(context: str) -> bool:
    if context_contains_negative_uncertainty(context):
        return False

    return any(
        marker in context
        for marker in [
            "all software is supported",
            "all operating systems are supported",
            "no unsupported software",
            "no unsupported operating systems",
            "unsupported software has been removed",
            "unsupported systems have been removed",
        ]
    )


def context_confirms_firewall_review(context: str) -> bool:
    if context_contains_negative_uncertainty(context):
        return False

    has_firewall = "firewall" in context or "router" in context
    has_review = "review" in context or "reviewed" in context
    has_password = "password" in context and (
        "changed" in context or "not default" in context or "unique" in context
    )

    return has_firewall and has_review and has_password


def context_confirms_malware_protection(context: str) -> bool:
    if context_contains_negative_uncertainty(context):
        return False

    has_protection = any(
        marker in context
        for marker in [
            "anti-malware",
            "antimalware",
            "defender",
            "application allow",
            "approved app",
            "mdm",
            "mobile device management",
        ]
    )

    has_positive = any(
        marker in context
        for marker in [
            "enabled",
            "installed",
            "updated",
            "active",
            "running",
            "blocking",
        ]
    )

    return has_protection and has_positive


def build_dynamic_clarification_questions(
    request: ConsultationRequest,
    gaps: list[ConsultationGap],
) -> list[str]:
    context = normalise(request.additional_context)
    questions: list[str] = []

    def add_question(question: str) -> None:
        if question not in questions:
            questions.append(question)

    for gap in gaps:
        issue = normalise(gap.issue)
        control = normalise(gap.control)

        if "personal devices" in issue or "device ownership" in issue:
            if "personal device" not in context and "byod" not in context:
                add_question(
                    "Which personal or BYOD devices access business data or cloud services, and are they managed in any way?"
                )

        if "cloud services" in issue:
            if (
                "microsoft 365" not in context
                and "google workspace" not in context
                and "cloud" not in context
            ):
                add_question(
                    "Which cloud services store or process business data, such as email, file storage, accounting, CRM, payroll or business social media accounts?"
                )

        if control == "firewalls":
            if not context_confirms_firewall_review(context):
                add_question(
                    "When were firewall/router default passwords last checked, and when were firewall rules last reviewed?"
                )

            if "inbound" not in context and "internet-facing" not in context:
                add_question(
                    "Are any services intentionally accessible from the internet, and is there a documented business need for them?"
                )

        if control == "secure configuration":
            if "unused" not in context and "unnecessary" not in context:
                add_question(
                    "Who checks for unused applications, unnecessary services and inactive user accounts, and how often is this reviewed?"
                )

            if (
                "screen lock" not in context
                and "device lock" not in context
                and "pin" not in context
            ):
                add_question(
                    "Which device types use screen lock, password, PIN or biometric protection?"
                )

        if control == "security update management":
            if not context_confirms_supported_software(context):
                add_question(
                    "Which operating systems, applications, browsers, routers or firewalls might be unsupported or close to end of support?"
                )

            if not context_confirms_updates_14_days(context):
                add_question(
                    "Who is responsible for checking and applying high-risk or critical updates within 14 days?"
                )

        if control == "user access control":
            if not context_confirms_unique_accounts(context):
                add_question(
                    "Do any systems still use shared accounts, or does every user have their own named account?"
                )

            if not context_confirms_admin_separation(context):
                add_question(
                    "Which accounts have administrator privileges, and are administrator accounts separate from everyday accounts?"
                )

            if not context_confirms_cloud_mfa(context):
                add_question(
                    "For each cloud service, is MFA enabled for all users and all administrators?"
                )

        if control == "malware protection":
            if not context_confirms_malware_protection(context):
                add_question(
                    "Which device types use anti-malware, application allow listing, approved app stores or mobile device management?"
                )

            if "malicious website" not in context and "web protection" not in context:
                add_question(
                    "Does the malware protection or browser configuration warn users about malicious websites?"
                )

    return questions[:6]


def evaluate_consultation_answers(
    request: ConsultationRequest,
) -> tuple[list[ConsultationStrength], list[ConsultationGap], list[str]]:
    strengths: list[ConsultationStrength] = []
    gaps: list[ConsultationGap] = []
    context = normalise(request.additional_context)

    if list_contains_any(request.devices, ["personal", "byod", "not sure"]):
        if (
            "personal devices are managed" in context
            or "byod devices are managed" in context
        ):
            add_strength(
                strengths=strengths,
                control="Scope",
                point="The additional clarification indicates that personal or BYOD devices are considered and managed.",
            )
        else:
            add_gap(
                gaps=gaps,
                control="Scope",
                severity="Medium",
                issue="Personal devices or unclear device ownership may affect scope.",
                why_it_matters=(
                    "Cyber Essentials scope needs to account for devices that access "
                    "organisational data or services. Personal devices can still be relevant "
                    "if they access business systems."
                ),
                recommended_action=(
                    "Create a simple device inventory showing which company-owned and "
                    "personal devices access business data or cloud services."
                ),
                related_reference="A2 Scope of Assessment",
                evidence_from_user=", ".join(request.devices),
            )

    if list_contains_any(request.cloud_services, ["not sure"]):
        if (
            "cloud services are listed" in context
            or "we use microsoft 365" in context
            or "we use google workspace" in context
        ):
            add_strength(
                strengths=strengths,
                control="Scope",
                point="The additional clarification identifies cloud services used by the organisation.",
            )
        else:
            add_gap(
                gaps=gaps,
                control="Scope",
                severity="Medium",
                issue="Cloud services may not be fully identified.",
                why_it_matters=(
                    "Cloud services are part of Cyber Essentials scope when they store "
                    "or process organisational data."
                ),
                recommended_action=(
                    "List all cloud services used for business purposes, including email, "
                    "file storage, CRM, accounting, payroll, website hosting, social media "
                    "business accounts and other SaaS platforms."
                ),
                related_reference="A2.9",
                evidence_from_user=", ".join(request.cloud_services),
            )
    elif request.cloud_services and not list_contains_any(
        request.cloud_services,
        ["no cloud services"],
    ):
        add_strength(
            strengths=strengths,
            control="Scope",
            point="The organisation has identified cloud services used for business purposes.",
        )

    if contains_any(request.firewall_protection, ["yes"]):
        add_strength(
            strengths=strengths,
            control="Firewalls",
            point="The organisation indicates that office networks and devices are protected by firewalls.",
        )
    else:
        add_gap(
            gaps=gaps,
            control="Firewalls",
            severity="High",
            issue="Firewall protection may be incomplete or unclear.",
            why_it_matters=(
                "Cyber Essentials requires every in-scope device to be protected by "
                "a correctly configured firewall or network device with firewall functionality."
            ),
            recommended_action=(
                "Confirm that office networks, remote devices, laptops, desktops and "
                "servers are protected by appropriate firewall controls."
            ),
            related_reference="A4.1",
            evidence_from_user=request.firewall_protection,
        )

    if contains_any(request.firewall_passwords_rules, ["both are done"]) or context_confirms_firewall_review(context):
        add_strength(
            strengths=strengths,
            control="Firewalls",
            point="Firewall/router default passwords appear to be changed and firewall rules are reviewed.",
        )
    elif contains_any(request.firewall_passwords_rules, ["passwords changed"]):
        add_gap(
            gaps=gaps,
            control="Firewalls",
            severity="Medium",
            issue="Firewall rules may not be reviewed regularly.",
            why_it_matters=(
                "Inbound firewall rules that are no longer needed should be removed "
                "to reduce exposure to internet-based attacks."
            ),
            recommended_action=(
                "Introduce a regular firewall rule review process and document the "
                "business need for allowed inbound connections."
            ),
            related_reference="A4.6 / A4.8",
            evidence_from_user=request.firewall_passwords_rules,
        )
    else:
        add_gap(
            gaps=gaps,
            control="Firewalls",
            severity="High",
            issue="Firewall password management or firewall rule review may be missing.",
            why_it_matters=(
                "Default router or firewall passwords and unmanaged firewall rules "
                "can create avoidable exposure."
            ),
            recommended_action=(
                "Confirm that all default firewall/router passwords have been changed "
                "and that firewall rules are reviewed and documented."
            ),
            related_reference="A4.2 / A4.6 / A4.8",
            evidence_from_user=request.firewall_passwords_rules,
        )

    if contains_any(request.unnecessary_software_accounts, ["yes"]):
        add_strength(
            strengths=strengths,
            control="Secure Configuration",
            point="Unnecessary applications, services and user accounts appear to be removed or disabled.",
        )
    else:
        add_gap(
            gaps=gaps,
            control="Secure Configuration",
            severity="Medium",
            issue="Unnecessary applications, services or user accounts may still exist.",
            why_it_matters=(
                "Default or unnecessary software, services and accounts increase the "
                "attack surface of devices and cloud services."
            ),
            recommended_action=(
                "Review laptops, desktops, servers, mobile devices and cloud services "
                "to remove or disable software, services and accounts that are not needed."
            ),
            related_reference="A5.1 / A5.2",
            evidence_from_user=request.unnecessary_software_accounts,
        )

    if contains_any(request.device_locking, ["all devices"]):
        add_strength(
            strengths=strengths,
            control="Secure Configuration",
            point="Devices appear to use screen lock, password, PIN or biometric access.",
        )
    else:
        add_gap(
            gaps=gaps,
            control="Secure Configuration",
            severity="Medium",
            issue="Device locking may not be applied consistently.",
            why_it_matters=(
                "Devices that access organisational data should require appropriate "
                "credentials before a user can access services."
            ),
            recommended_action=(
                "Ensure all laptops, desktops, tablets and mobile devices use a locking "
                "mechanism such as password, PIN, biometric access or equivalent controls."
            ),
            related_reference="A5.9 / A5.10",
            evidence_from_user=request.device_locking,
        )

    if contains_any(request.supported_software, ["yes"]) or context_confirms_supported_software(context):
        add_strength(
            strengths=strengths,
            control="Security Update Management",
            point="Operating systems, applications, browsers, routers and firewalls appear to be supported.",
        )
    else:
        add_gap(
            gaps=gaps,
            control="Security Update Management",
            severity="High",
            issue="Unsupported operating systems, firmware or applications may be in use.",
            why_it_matters=(
                "Cyber Essentials requires in-scope software to be licensed, supported "
                "and receiving vulnerability fixes."
            ),
            recommended_action=(
                "Create a software and operating system inventory and replace, remove "
                "or appropriately isolate unsupported software."
            ),
            related_reference="A6.1 / A6.2 / A6.6 / A6.7",
            evidence_from_user=request.supported_software,
        )

    if contains_any(request.critical_updates_14_days, ["yes"]) or context_confirms_updates_14_days(context):
        add_strength(
            strengths=strengths,
            control="Security Update Management",
            point="High-risk or critical updates appear to be applied within 14 days.",
        )
    elif contains_any(request.critical_updates_14_days, ["sometimes"]):
        add_gap(
            gaps=gaps,
            control="Security Update Management",
            severity="High",
            issue="High-risk or critical updates may not always be installed within 14 days.",
            why_it_matters=(
                "Cyber Essentials requires high-risk or critical vulnerability fixes "
                "to be installed within 14 days of release where the criteria apply."
            ),
            recommended_action=(
                "Define who is responsible for monitoring and applying high-risk or "
                "critical updates, and use automatic updates where possible."
            ),
            related_reference="A6.4 / A6.5",
            evidence_from_user=request.critical_updates_14_days,
        )
    else:
        add_gap(
            gaps=gaps,
            control="Security Update Management",
            severity="High",
            issue="The 14-day update process may be missing or unclear.",
            why_it_matters=(
                "Delayed patching of critical or high-risk vulnerabilities can leave "
                "systems exposed to known attacks."
            ),
            recommended_action=(
                "Implement a process to apply high-risk or critical operating system, "
                "application, router and firewall firmware updates within 14 days."
            ),
            related_reference="A6.4 / A6.5",
            evidence_from_user=request.critical_updates_14_days,
        )

    if contains_any(request.unique_accounts, ["yes"]) or context_confirms_unique_accounts(context):
        add_strength(
            strengths=strengths,
            control="User Access Control",
            point="Users appear to have unique accounts rather than shared accounts.",
        )
    else:
        add_gap(
            gaps=gaps,
            control="User Access Control",
            severity="High",
            issue="Shared or non-unique user accounts may exist.",
            why_it_matters=(
                "Cyber Essentials requires users to authenticate with unique credentials "
                "before accessing applications or devices."
            ),
            recommended_action=(
                "Replace shared accounts with named user accounts and ensure each user "
                "has unique credentials."
            ),
            related_reference="A7.2",
            evidence_from_user=request.unique_accounts,
        )

    if contains_any(request.admin_account_separation, ["yes"]) or context_confirms_admin_separation(context):
        add_strength(
            strengths=strengths,
            control="User Access Control",
            point="Administrator accounts appear to be separate from everyday user accounts.",
        )
    elif contains_any(request.admin_account_separation, ["partly"]):
        add_gap(
            gaps=gaps,
            control="User Access Control",
            severity="Medium",
            issue="Administrator account separation may be inconsistent.",
            why_it_matters=(
                "Administrator accounts should be used only for administrative tasks, "
                "not for email, web browsing or day-to-day work."
            ),
            recommended_action=(
                "Create separate administrator accounts and prevent them from being "
                "used for standard user activities."
            ),
            related_reference="A7.6 / A7.7",
            evidence_from_user=request.admin_account_separation,
        )
    else:
        add_gap(
            gaps=gaps,
            control="User Access Control",
            severity="High",
            issue="Administrator accounts may not be separated from everyday user accounts.",
            why_it_matters=(
                "Using privileged accounts for routine activities increases the impact "
                "of malware, phishing or account compromise."
            ),
            recommended_action=(
                "Use separate administrator accounts for administrative tasks and standard "
                "accounts for daily work."
            ),
            related_reference="A7.6 / A7.7",
            evidence_from_user=request.admin_account_separation,
        )

    if (
        contains_any(request.cloud_mfa, ["all users and administrators", "no cloud services"])
        or context_confirms_cloud_mfa(context)
    ):
        add_strength(
            strengths=strengths,
            control="User Access Control",
            point="MFA appears to be applied appropriately to cloud services, or no cloud services are used.",
        )
    elif contains_any(request.cloud_mfa, ["only for administrators", "some users"]):
        add_gap(
            gaps=gaps,
            control="User Access Control",
            severity="High",
            issue="MFA may not be applied to all cloud service users.",
            why_it_matters=(
                "Cyber Essentials requires MFA for cloud services where available, "
                "including users and administrators."
            ),
            recommended_action=(
                "Review all cloud services and enable MFA for all users and administrators "
                "where the service supports it."
            ),
            related_reference="A7.14 / A7.16 / A7.17",
            evidence_from_user=request.cloud_mfa,
        )
    else:
        add_gap(
            gaps=gaps,
            control="User Access Control",
            severity="High",
            issue="MFA status for cloud services is missing or unclear.",
            why_it_matters=(
                "Cloud accounts are commonly targeted, and Cyber Essentials requires "
                "MFA where available."
            ),
            recommended_action=(
                "Identify all cloud services and confirm whether MFA is enabled for "
                "users and administrators."
            ),
            related_reference="A7.14 / A7.16 / A7.17",
            evidence_from_user=request.cloud_mfa,
        )

    if (
        list_contains_any(
            request.malware_protection,
            ["anti-malware", "application allow", "mobile device management"],
        )
        or context_confirms_malware_protection(context)
    ):
        add_strength(
            strengths=strengths,
            control="Malware Protection",
            point="The organisation has identified at least one malware protection approach.",
        )
    else:
        add_gap(
            gaps=gaps,
            control="Malware Protection",
            severity="High",
            issue="No clear malware protection mechanism has been identified.",
            why_it_matters=(
                "Cyber Essentials requires an active malware protection mechanism "
                "on all in-scope devices."
            ),
            recommended_action=(
                "Use anti-malware software, application allow listing, approved app stores "
                "or equivalent controls across in-scope devices."
            ),
            related_reference="A8.1",
            evidence_from_user=", ".join(request.malware_protection),
        )

    if contains_any(request.malware_updated_blocking, ["yes"]) or context_confirms_malware_protection(context):
        add_strength(
            strengths=strengths,
            control="Malware Protection",
            point="Malware protection appears to be updated and configured to block malicious activity.",
        )
    else:
        add_gap(
            gaps=gaps,
            control="Malware Protection",
            severity="Medium",
            issue="Malware protection may not be updated or configured to block malicious activity.",
            why_it_matters=(
                "Anti-malware should be updated in line with vendor recommendations "
                "and configured to prevent malware from running."
            ),
            recommended_action=(
                "Check that anti-malware is active, updated, prevents malware execution "
                "and warns about malicious websites where applicable."
            ),
            related_reference="A8.2 / A8.3",
            evidence_from_user=request.malware_updated_blocking,
        )

    clarification_questions = build_dynamic_clarification_questions(
        request=request,
        gaps=gaps,
    )

    return strengths, gaps, clarification_questions


def calculate_overall_readiness(gaps: list[ConsultationGap]) -> str:
    high_count = sum(1 for gap in gaps if gap.severity == "High")
    medium_count = sum(1 for gap in gaps if gap.severity == "Medium")

    if high_count >= 3:
        return "Low"

    if high_count >= 1 or medium_count >= 4:
        return "Medium"

    if medium_count >= 1:
        return "Medium"

    return "High"


def build_retrieval_query(
    request: ConsultationRequest,
    gaps: list[ConsultationGap],
) -> str:
    gap_text = "\n".join(
        [
            f"- {gap.control}: {gap.issue} ({gap.related_reference})"
            for gap in gaps
        ]
    )

    return f"""
Cyber Essentials consultation request.

Organisation size:
{request.organisation_size}

IT management:
{request.it_management}

Devices:
{", ".join(request.devices)}

Cloud services:
{", ".join(request.cloud_services)}

Main identified gaps:
{gap_text}

Additional context and clarifications:
{request.additional_context}
""".strip()


def retrieve_consultation_context(
    request: ConsultationRequest,
    gaps: list[ConsultationGap],
    match_count: int = 6,
) -> list[dict]:
    retrieval_query = build_retrieval_query(request, gaps)
    query_embedding = create_embedding(retrieval_query)

    response = supabase.rpc(
        "match_document_chunks",
        {
            "query_embedding": query_embedding,
            "match_count": match_count,
            "filter_topic_id": None,
        },
    ).execute()

    return response.data or []


def build_sources(retrieved_chunks: list[dict]) -> list[ConsultationSource]:
    sources: list[ConsultationSource] = []

    for chunk in retrieved_chunks:
        sources.append(
            ConsultationSource(
                id=chunk["id"],
                topic_id=chunk.get("topic_id"),
                section_title=chunk.get("section_title"),
                page_number=chunk.get("page_number"),
                similarity=chunk.get("similarity"),
                content_preview=chunk.get("content", "")[:250],
            )
        )

    return sources


def get_azure_client() -> AzureOpenAI:
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-10-21")

    if not endpoint:
        raise RuntimeError("AZURE_OPENAI_ENDPOINT is not set")

    if not api_key:
        raise RuntimeError("AZURE_OPENAI_API_KEY is not set")

    return AzureOpenAI(
        azure_endpoint=endpoint.rstrip("/"),
        api_key=api_key,
        api_version=api_version,
    )


def get_chat_deployment() -> str:
    deployment = (
        os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT")
        or os.getenv("AZURE_OPENAI_DEPLOYMENT")
        or os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
    )

    if not deployment:
        raise RuntimeError(
            "AZURE_OPENAI_CHAT_DEPLOYMENT, AZURE_OPENAI_DEPLOYMENT or "
            "AZURE_OPENAI_DEPLOYMENT_NAME is not set"
        )

    return deployment


def get_chat_client():
    base_url = os.getenv("AZURE_OPENAI_BASE_URL")
    api_key = os.getenv("AZURE_OPENAI_API_KEY")

    if not api_key:
        raise RuntimeError("AZURE_OPENAI_API_KEY is not set")

    if base_url:
        return OpenAI(
            base_url=base_url.rstrip("/") + "/",
            api_key=api_key,
        )

    return get_azure_client()


def create_chat_completion_text(
    messages: list[dict],
    temperature: float,
    max_tokens: int,
) -> str:
    client = get_chat_client()
    deployment = get_chat_deployment()

    response = client.chat.completions.create(
        model=deployment,
        messages=messages,
        temperature=temperature,
        max_completion_tokens=max_tokens,
    )

    content = response.choices[0].message.content

    if not content:
        return ""

    return content.strip()


def generate_ai_summary(
    request: ConsultationRequest,
    overall_readiness: str,
    strengths: list[ConsultationStrength],
    gaps: list[ConsultationGap],
    clarification_questions: list[str],
    retrieved_chunks: list[dict],
) -> str:
    if not gaps and strengths:
        return (
            "Based on the answers and clarifications provided, no major readiness "
            "gaps were identified in the shortened consultation questionnaire. "
            "The organisation appears to have addressed several important Cyber "
            "Essentials themes, although the official self-assessment question set "
            "should still be reviewed separately."
        )

    context_preview = "\n\n".join(
        [
            f"Source {index + 1}: {chunk.get('content', '')[:900]}"
            for index, chunk in enumerate(retrieved_chunks[:4])
        ]
    )

    system_prompt = """
You are a Cyber Essentials readiness consultation assistant for a learning prototype.

You must:
- provide formative readiness guidance only
- avoid official certification, audit or compliance decisions
- avoid saying the organisation will pass or fail Cyber Essentials
- base the explanation on the provided structured analysis and retrieved Cyber Essentials context
- keep the summary concise and practical
- reflect any additional clarification provided by the user
- do not include a repeated standard disclaimer paragraph in the summary because the interface already shows warnings elsewhere

Do not ask for sensitive information such as real company names, IP addresses, passwords, usernames, internal hostnames, credentials or confidential configurations.
""".strip()

    user_prompt = {
        "overall_readiness": overall_readiness,
        "organisation_size": request.organisation_size,
        "it_management": request.it_management,
        "devices": request.devices,
        "cloud_services": request.cloud_services,
        "additional_context_and_clarifications": request.additional_context,
        "strengths": [strength.model_dump() for strength in strengths],
        "potential_gaps": [gap.model_dump() for gap in gaps],
        "clarification_questions": clarification_questions,
        "retrieved_context": context_preview,
        "task": (
            "Write one short paragraph summarising the organisation's Cyber Essentials "
            "readiness position. The paragraph should clearly reflect whether the user's "
            "latest clarification reduced, confirmed or changed any concerns."
        ),
    }

    content = create_chat_completion_text(
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": json.dumps(user_prompt, ensure_ascii=False),
            },
        ],
        temperature=0.2,
        max_tokens=260,
    )

    if not content:
        return build_fallback_summary(overall_readiness, gaps)

    return content


def build_fallback_summary(
    overall_readiness: str,
    gaps: list[ConsultationGap],
) -> str:
    if not gaps:
        return (
            "Based on the answers and clarifications provided, no major readiness "
            "gaps were identified in the shortened consultation questionnaire."
        )

    high_count = sum(1 for gap in gaps if gap.severity == "High")
    medium_count = sum(1 for gap in gaps if gap.severity == "Medium")

    return (
        f"The shortened consultation indicates {overall_readiness.lower()} overall "
        f"readiness, with {high_count} high-severity and {medium_count} "
        "medium-severity potential gap(s). The identified areas should be reviewed "
        "against the official Cyber Essentials requirements."
    )


def build_recommended_next_steps(gaps: list[ConsultationGap]) -> list[str]:
    if not gaps:
        return [
            "Continue reviewing the official Cyber Essentials requirements and self-assessment question set.",
            "Keep asset, account, update and firewall rule records current.",
            "Repeat the readiness consultation if the organisation's IT setup changes.",
        ]

    high_gaps = [gap for gap in gaps if gap.severity == "High"]
    medium_gaps = [gap for gap in gaps if gap.severity == "Medium"]

    ordered_gaps = high_gaps + medium_gaps
    next_steps: list[str] = []

    for gap in ordered_gaps:
        if gap.recommended_action not in next_steps:
            next_steps.append(gap.recommended_action)

        if len(next_steps) >= 5:
            break

    return next_steps


@router.post("/explain-field", response_model=ConsultationFieldHelpResponse)
def explain_consultation_field(request: ConsultationFieldHelpRequest):
    follow_up = request.user_follow_up.strip()

    if not follow_up:
        raise HTTPException(status_code=400, detail="Follow-up question is required.")

    try:
        safe_history = []
        for message in request.recent_messages[-8:]:
            role = "assistant" if message.role == "assistant" else "user"
            content = message.content.strip()

            if content:
                safe_history.append(
                    {
                        "role": role,
                        "content": content[:900],
                    }
                )

        system_prompt = """
You are an AI help assistant inside a Cyber Essentials learning prototype.

Your job is to help a small business user understand a consultation question.

You must:
- explain the meaning of the field in plain, non-technical language
- help the user understand what information they may need to check
- explain answer options in general terms where useful
- keep the answer short and practical
- avoid making official Cyber Essentials certification, audit or compliance decisions
- avoid saying the organisation will pass or fail Cyber Essentials
- avoid completing the form on behalf of the user
- avoid requesting sensitive information

You must not ask for or encourage the user to provide:
- real company names
- employee names
- IP addresses
- usernames
- passwords
- credentials
- internal hostnames
- detailed firewall rules
- confidential configurations
- customer data
- screenshots containing sensitive information

If the user gives a concrete example, you may explain how to think about it in general terms, but remind them to choose the option that best matches their actual situation.
""".strip()

        context_payload = {
            "field_id": request.field_id,
            "field_title": request.field_title,
            "field_question": request.field_question,
            "static_explanation": request.static_explanation,
            "current_answer": request.current_answer,
            "task": (
                "Answer the user's follow-up question about this consultation field. "
                "Do not provide an official compliance decision. "
                "Do not ask for sensitive details."
            ),
        }

        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": json.dumps(context_payload, ensure_ascii=False),
            },
        ]

        messages.extend(safe_history)
        messages.append({"role": "user", "content": follow_up})

        content = create_chat_completion_text(
            messages=messages,
            temperature=0.2,
            max_tokens=320,
        )

        if not content:
            return ConsultationFieldHelpResponse(
                answer=(
                    "I could not generate a detailed explanation for this question. "
                    "In general, answer using non-sensitive information and choose "
                    "'Not sure' if you cannot confirm the relevant setting."
                )
            )

        return ConsultationFieldHelpResponse(answer=content)

    except HTTPException:
        raise
    except Exception as exc:
        import traceback

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"{type(exc).__name__}: {str(exc)}",
        )


@router.post("/analyse", response_model=ConsultationResponse)
def analyse_consultation(request: ConsultationRequest):
    try:
        strengths, gaps, clarification_questions = evaluate_consultation_answers(request)
        overall_readiness = calculate_overall_readiness(gaps)

        try:
            retrieved_chunks = retrieve_consultation_context(request, gaps)
        except Exception:
            retrieved_chunks = []

        try:
            summary = generate_ai_summary(
                request=request,
                overall_readiness=overall_readiness,
                strengths=strengths,
                gaps=gaps,
                clarification_questions=clarification_questions,
                retrieved_chunks=retrieved_chunks,
            )
        except Exception:
            summary = build_fallback_summary(overall_readiness, gaps)

        return ConsultationResponse(
            overall_readiness=overall_readiness,
            summary=summary,
            strengths=strengths,
            potential_gaps=gaps,
            clarification_questions=clarification_questions,
            recommended_next_steps=build_recommended_next_steps(gaps),
            sources=build_sources(retrieved_chunks),
            disclaimer=DISCLAIMER,
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))