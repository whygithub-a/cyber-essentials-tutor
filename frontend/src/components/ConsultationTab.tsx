import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Form,
  ListGroup,
  Modal,
  Spinner,
} from "react-bootstrap";

type ConsultationGap = {
  control: string;
  severity: string;
  issue: string;
  why_it_matters: string;
  recommended_action: string;
  related_reference: string;
  evidence_from_user: string;
};

type ConsultationStrength = {
  control: string;
  point: string;
};

type ConsultationSource = {
  id: string;
  topic_id: string | null;
  section_title: string | null;
  page_number: number | null;
  similarity: number | null;
  content_preview: string;
};

type ConsultationResponse = {
  overall_readiness: string;
  summary: string;
  strengths: ConsultationStrength[];
  potential_gaps: ConsultationGap[];
  clarification_questions: string[];
  recommended_next_steps: string[];
  sources: ConsultationSource[];
  disclaimer: string;
};

type ConsultationTabProps = {
  apiBaseUrl: string;
  sessionId: string;
};

type ConsultationHelpItem = {
  id: string;
  title: string;
  question: string;
  plainMeaning: string;
  whyItMatters: string;
  howToAnswer: string;
  example: string;
  privacyReminder: string;
};

type ConsultationHelpMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type ConsultationFieldHelpResponse = {
  answer: string;
};

const DEVICE_OPTIONS = [
  "Company laptops/desktops",
  "Personal devices / BYOD",
  "Mobile phones/tablets",
  "Servers",
  "Cloud-hosted systems",
  "Not sure",
];

const CLOUD_SERVICE_OPTIONS = [
  "Microsoft 365 / Google Workspace",
  "Cloud storage",
  "CRM/accounting/payroll system",
  "Website or hosting platform",
  "Social media business accounts",
  "Other SaaS platforms",
  "No cloud services",
  "Not sure",
];

const MALWARE_PROTECTION_OPTIONS = [
  "Anti-malware software",
  "Application allow listing / approved app store",
  "Mobile device management",
  "Users are trained not to install unknown software",
  "No clear protection",
  "Not sure",
];

const CONSULTATION_HELP_ITEMS: Record<string, ConsultationHelpItem> = {
  organisation_size: {
    id: "organisation_size",
    title: "Organisation size",
    question: "What best describes your organisation?",
    plainMeaning:
      "This asks roughly how many people are in your organisation. It helps the system understand whether the consultation is for a very small business, a small team, a medium organisation, or a larger organisation.",
    whyItMatters:
      "Smaller organisations often have less formal IT management, while larger organisations may have more devices, accounts and cloud services to manage. The answer helps frame the readiness guidance.",
    howToAnswer:
      "Choose the option that best matches the number of people who work in or regularly use systems for the organisation. It does not need to be exact.",
    example:
      "If you are a founder with five employees, choose 'Micro business: 1-9 people'. If you have around 30 staff, choose 'Small business: 10-49 people'.",
    privacyReminder:
      "Do not enter real staff names or personal details. A general size category is enough.",
  },
  it_management: {
    id: "it_management",
    title: "IT management",
    question: "Who mainly manages your IT systems?",
    plainMeaning:
      "This asks who looks after computers, accounts, software, cloud services, routers, updates and other IT settings for the organisation.",
    whyItMatters:
      "Cyber Essentials readiness often depends on whether someone is clearly responsible for updates, account management, firewall settings and security configuration.",
    howToAnswer:
      "Choose the option that best describes who normally handles IT decisions or fixes. If an external company helps sometimes but the owner also manages some settings, 'Mixed' may be suitable.",
    example:
      "If the business owner sets up Microsoft 365 accounts and laptops, choose 'Founder / business owner'. If an outsourced IT company manages most systems, choose 'External IT provider'.",
    privacyReminder:
      "Do not enter the name of your IT provider, employee names, email addresses or internal contact details.",
  },
  devices: {
    id: "devices",
    title: "Devices that access business data",
    question: "Which devices access business data or services?",
    plainMeaning:
      "This asks what types of devices can access business information, such as company email, cloud storage, customer records, accounting systems, website admin panels or internal documents.",
    whyItMatters:
      "Devices that access business data may be relevant to Cyber Essentials scope. This can include company-owned devices and personal devices if they are used for business systems.",
    howToAnswer:
      "Tick every type of device that is used to access business data. If you are unsure whether a device type is included, tick 'Not sure' and explain in general terms later.",
    example:
      "If staff use company laptops and also check work email on personal phones, tick 'Company laptops/desktops', 'Mobile phones/tablets' and possibly 'Personal devices / BYOD'.",
    privacyReminder:
      "Do not enter device names, serial numbers, IP addresses, usernames, asset tags or detailed internal configurations.",
  },
  cloud_services: {
    id: "cloud_services",
    title: "Cloud services",
    question: "Which cloud services are used?",
    plainMeaning:
      "This asks which online services your organisation uses to store, process or access business information. Cloud services are not only technical servers; they can include email, file storage, accounting systems, CRM systems, payroll platforms, website hosting and business social media accounts.",
    whyItMatters:
      "Cloud services can be part of Cyber Essentials scope when they store or process organisational data. Small businesses sometimes overlook these services because they do not think of them as IT infrastructure.",
    howToAnswer:
      "Tick all service categories that apply. If you use a service but are not sure which category it belongs to, tick 'Other SaaS platforms' or 'Not sure'.",
    example:
      "Microsoft 365 email, Google Drive, Dropbox, Xero, QuickBooks, Shopify, website hosting platforms and business Facebook or Instagram accounts may all be relevant.",
    privacyReminder:
      "Do not enter real account names, URLs, customer records, login names, passwords or confidential system details.",
  },
  firewall_protection: {
    id: "firewall_protection",
    title: "Firewall protection",
    question: "Are all office networks and devices protected by a firewall?",
    plainMeaning:
      "This asks whether your internet connection, office network and devices have firewall protection. A firewall helps control network traffic and reduces unwanted access from the internet.",
    whyItMatters:
      "Cyber Essentials expects in-scope devices to be protected by a correctly configured firewall or equivalent network protection.",
    howToAnswer:
      "Choose 'Yes' only if you are reasonably confident that all relevant networks and devices are protected. Choose 'Partly' if only some are protected. Choose 'Not sure' if you do not know.",
    example:
      "A small office may use a router with firewall functionality. Remote laptops may also use operating system firewalls, such as Windows Defender Firewall or macOS firewall settings.",
    privacyReminder:
      "Do not enter public IP addresses, router admin details, firewall rule details, passwords or network diagrams.",
  },
  firewall_passwords_rules: {
    id: "firewall_passwords_rules",
    title: "Firewall passwords and rules",
    question:
      "Are firewall/router default passwords changed and are firewall rules reviewed?",
    plainMeaning:
      "This asks two things: whether default admin passwords on routers or firewalls have been changed, and whether firewall rules are checked so that unnecessary access is not left open.",
    whyItMatters:
      "Default passwords and unnecessary firewall rules can create avoidable exposure. Regular review helps make sure only needed connections are allowed.",
    howToAnswer:
      "Choose the option that best matches your situation. If you know passwords were changed but do not know whether rules are reviewed, choose the matching partial option.",
    example:
      "If an external IT provider changed the router password but you do not know whether inbound rules are reviewed, choose 'Passwords changed, but rules are not reviewed' or 'Not sure'.",
    privacyReminder:
      "Do not enter actual passwords, router addresses, firewall configuration details or screenshots of rules.",
  },
  unnecessary_software_accounts: {
    id: "unnecessary_software_accounts",
    title: "Unnecessary software, services and accounts",
    question:
      "Are unnecessary applications, services and user accounts removed or disabled?",
    plainMeaning:
      "This asks whether devices and cloud services are kept tidy by removing software, services or accounts that are no longer needed.",
    whyItMatters:
      "Unneeded apps, services and accounts can increase the attack surface. Old accounts may also be misused if they are not disabled.",
    howToAnswer:
      "Choose 'Yes' if there is a clear process for removing or disabling things that are not needed. Choose 'Partly' if this is done sometimes but not consistently.",
    example:
      "If an employee leaves, their account should be disabled. If a laptop has unused remote access tools or trial software, those should be removed if not needed.",
    privacyReminder:
      "Do not enter employee names, usernames, software licence keys or detailed system inventories.",
  },
  device_locking: {
    id: "device_locking",
    title: "Device locking",
    question:
      "Are devices protected by screen lock, password, PIN or biometric access?",
    plainMeaning:
      "This asks whether devices require a person to unlock them before accessing business data or services.",
    whyItMatters:
      "If a device is lost, stolen or left unattended, locking mechanisms help prevent unauthorised access to business information.",
    howToAnswer:
      "Choose 'Yes, on all devices' only if all relevant devices use a password, PIN, biometric login or similar protection. Choose 'Some devices only' if this is inconsistent.",
    example:
      "A company laptop that requires a Windows password or PIN is protected. A phone that opens without a passcode is not adequately protected.",
    privacyReminder:
      "Do not enter actual passwords, PINs, biometric details or device identifiers.",
  },
  supported_software: {
    id: "supported_software",
    title: "Supported software",
    question:
      "Are all operating systems, applications, browsers, routers and firewalls still supported?",
    plainMeaning:
      "This asks whether the software and firmware you use still receive security updates from the vendor. 'Supported' does not simply mean that the software still opens or appears to work.",
    whyItMatters:
      "Unsupported software may stop receiving security fixes, which can leave known vulnerabilities unresolved.",
    howToAnswer:
      "Choose 'Yes' if you are confident that operating systems, apps, browsers, routers and firewall firmware are still supported. Choose 'Some may be unsupported' if you suspect old systems are still in use.",
    example:
      "An old laptop running an operating system that no longer receives security updates may count as unsupported even if it still works.",
    privacyReminder:
      "Do not enter serial numbers, licence keys, internal hostnames or detailed asset records.",
  },
  critical_updates_14_days: {
    id: "critical_updates_14_days",
    title: "Critical updates within 14 days",
    question:
      "Are high-risk or critical security updates normally installed within 14 days?",
    plainMeaning:
      "This asks whether important security fixes are applied quickly. It is about high-risk or critical vulnerability fixes, not ordinary feature updates.",
    whyItMatters:
      "Delays in applying critical updates can leave systems exposed to known attacks.",
    howToAnswer:
      "Choose 'Yes' if there is a reliable process for applying critical or high-risk updates within 14 days. Choose 'Sometimes' if this happens inconsistently.",
    example:
      "If Windows, browsers, business apps and router firmware are checked regularly and important updates are installed promptly, 'Yes' may be appropriate.",
    privacyReminder:
      "Do not enter internal patch records, device names, IP addresses or confidential vulnerability details.",
  },
  unique_accounts: {
    id: "unique_accounts",
    title: "Unique user accounts",
    question:
      "Does every user have their own account, instead of shared accounts?",
    plainMeaning:
      "This asks whether each person signs in with their own account rather than multiple people sharing one login.",
    whyItMatters:
      "Unique accounts make it easier to control access, remove access when someone leaves, and understand who performed an action.",
    howToAnswer:
      "Choose 'Yes' if each user has their own named account. Choose 'Some shared accounts exist' if any shared logins are still used.",
    example:
      "If all staff use their own Microsoft 365 accounts, that supports unique account use. If everyone uses one shared admin login, that is a shared account.",
    privacyReminder:
      "Do not enter real usernames, email addresses, passwords or employee names.",
  },
  admin_account_separation: {
    id: "admin_account_separation",
    title: "Administrator account separation",
    question:
      "Are administrator accounts separate from everyday user accounts?",
    plainMeaning:
      "This asks whether people use a normal account for daily work and a separate administrator account only when they need to make system changes.",
    whyItMatters:
      "Using administrator accounts for routine work increases the damage that malware or account compromise can cause.",
    howToAnswer:
      "Choose 'Yes' if administrator privileges are separated from daily accounts. Choose 'Partly' if this is true for some systems but not all.",
    example:
      "A business owner may use one normal account for email and documents, and a separate admin account only for adding users or changing security settings.",
    privacyReminder:
      "Do not enter administrator usernames, passwords, email addresses or internal role lists.",
  },
  cloud_mfa: {
    id: "cloud_mfa",
    title: "MFA for cloud services",
    question: "Is MFA enabled for cloud services where available?",
    plainMeaning:
      "This asks whether cloud accounts require multi-factor authentication. MFA means users need something beyond just a password, such as an authenticator app, SMS code, hardware key or approval prompt.",
    whyItMatters:
      "Cloud accounts are common targets. MFA makes account takeover harder if a password is guessed, stolen or reused.",
    howToAnswer:
      "Choose the option that best matches your cloud services. If MFA is enabled only for administrators but not normal users, choose the administrator-only option.",
    example:
      "If Microsoft 365 asks every staff member for an authenticator app code or approval prompt when signing in, MFA is likely enabled for users.",
    privacyReminder:
      "Do not enter phone numbers, MFA recovery codes, account names, screenshots or login details.",
  },
  malware_protection: {
    id: "malware_protection",
    title: "Malware protection approach",
    question: "How are devices protected from malware?",
    plainMeaning:
      "This asks what controls are used to reduce the risk of malicious software running on devices.",
    whyItMatters:
      "Cyber Essentials expects in-scope devices to have an active malware protection approach, such as anti-malware software, application allow listing, approved app stores or mobile device management.",
    howToAnswer:
      "Tick all approaches that apply. If you do not know what is used, tick 'Not sure'.",
    example:
      "Windows devices may use Microsoft Defender. Company phones may be controlled through mobile device management. Some devices may only allow apps from an approved app store.",
    privacyReminder:
      "Do not enter device names, security product licence keys, internal configuration screenshots or detailed security policies.",
  },
  malware_updated_blocking: {
    id: "malware_updated_blocking",
    title: "Updated and blocking malware protection",
    question:
      "Is malware protection kept updated and configured to block malicious activity?",
    plainMeaning:
      "This asks whether malware protection is active, receives updates and is set to block or prevent malicious activity rather than only reporting it.",
    whyItMatters:
      "Malware protection is more useful when it is up to date and configured to prevent threats from running.",
    howToAnswer:
      "Choose 'Yes' if protection is active, updated and blocking threats. Choose 'Partly' if you are not sure whether this applies to every device.",
    example:
      "An anti-malware tool that updates automatically and blocks detected malware would usually support a 'Yes' answer.",
    privacyReminder:
      "Do not enter security console screenshots, device identifiers, malware logs or internal configuration details.",
  },
  additional_context: {
    id: "additional_context",
    title: "Additional context",
    question: "Describe any extra setup details in general terms.",
    plainMeaning:
      "This optional box lets you add general information that did not fit into the tick-box answers.",
    whyItMatters:
      "Extra context can help the system produce a more useful readiness report, especially where your answers are partial or uncertain.",
    howToAnswer:
      "Write only broad, non-sensitive details. Focus on general setup patterns rather than exact technical information.",
    example:
      "A suitable example is: 'We use Microsoft 365, staff work from home, laptops are company-owned, and an external IT provider manages most settings.'",
    privacyReminder:
      "Do not include real company names, employee names, IP addresses, usernames, passwords, credentials, internal hostnames or confidential configurations.",
  },
};

function getSeverityVariant(severity: string): string {
  if (severity === "High") return "danger";
  if (severity === "Medium") return "warning";
  return "secondary";
}

function getSeverityTextColour(severity: string): "dark" | undefined {
  if (severity === "Medium") return "dark";
  return undefined;
}

function getReadinessVariant(readiness: string): string {
  if (readiness === "High") return "success";
  if (readiness === "Medium") return "warning";
  return "danger";
}

function getReadinessTextColour(readiness: string): "dark" | undefined {
  if (readiness === "Medium") return "dark";
  return undefined;
}

function toggleListValue(
  currentValues: string[],
  value: string,
  setValues: (values: string[]) => void
) {
  if (currentValues.includes(value)) {
    setValues(currentValues.filter((item) => item !== value));
    return;
  }

  setValues([...currentValues, value]);
}

function formatCurrentAnswer(value: string | string[]): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "No option selected yet.";
  }

  return value.trim() ? value : "No answer entered yet.";
}

function ConsultationTab({ apiBaseUrl, sessionId }: ConsultationTabProps) {
  const reportContainerRef = useRef<HTMLDivElement | null>(null);
  const helpMessagesContainerRef = useRef<HTMLDivElement | null>(null);
  const latestHelpAssistantMessageRef = useRef<HTMLDivElement | null>(null);

  const [organisationSize, setOrganisationSize] = useState(
    "Micro business: 1-9 people"
  );
  const [itManagement, setItManagement] = useState("Founder / business owner");

  const [devices, setDevices] = useState<string[]>([]);
  const [cloudServices, setCloudServices] = useState<string[]>([]);

  const [firewallProtection, setFirewallProtection] = useState("Not sure");
  const [firewallPasswordsRules, setFirewallPasswordsRules] =
    useState("Not sure");

  const [unnecessarySoftwareAccounts, setUnnecessarySoftwareAccounts] =
    useState("Not sure");
  const [deviceLocking, setDeviceLocking] = useState("Not sure");

  const [supportedSoftware, setSupportedSoftware] = useState("Not sure");
  const [criticalUpdates14Days, setCriticalUpdates14Days] =
    useState("Not sure");

  const [uniqueAccounts, setUniqueAccounts] = useState("Not sure");
  const [adminAccountSeparation, setAdminAccountSeparation] =
    useState("Not sure");
  const [cloudMfa, setCloudMfa] = useState("Not sure");

  const [malwareProtection, setMalwareProtection] = useState<string[]>([]);
  const [malwareUpdatedBlocking, setMalwareUpdatedBlocking] =
    useState("Not sure");

  const [additionalContext, setAdditionalContext] = useState("");
  const [clarificationAnswers, setClarificationAnswers] = useState<
    Record<string, string>
  >({});
  const [clarificationHistory, setClarificationHistory] = useState<string[]>(
    []
  );
  const [pendingClarificationQuestions, setPendingClarificationQuestions] =
    useState<string[]>([]);

  const [consultationResult, setConsultationResult] =
    useState<ConsultationResponse | null>(null);
  const [loadingConsultation, setLoadingConsultation] = useState(false);
  const [consultationError, setConsultationError] = useState("");
  const [reportVersion, setReportVersion] = useState(1);
  const [reportUpdateMessage, setReportUpdateMessage] = useState("");

  const [activeHelpId, setActiveHelpId] = useState<string | null>(null);
  const [helpDrafts, setHelpDrafts] = useState<Record<string, string>>({});
  const [helpMessages, setHelpMessages] = useState<
    Record<string, ConsultationHelpMessage[]>
  >({});
  const [loadingHelpAnswer, setLoadingHelpAnswer] = useState(false);
  const [helpError, setHelpError] = useState("");

  const getClarificationHelpId = (question: string) =>
    `clarification_question:${question}`;

  const getClarificationQuestionFromHelpId = (helpId: string) => {
    const prefix = "clarification_question:";

    if (!helpId.startsWith(prefix)) return null;

    return helpId.slice(prefix.length);
  };

  const buildClarificationHelpItem = (
    question: string
  ): ConsultationHelpItem => {
    const predefinedClarificationHelp: Record<
      string,
      Omit<ConsultationHelpItem, "id" | "question">
    > = {
      "Which personal or BYOD devices access business data or cloud services, and are they managed in any way?": {
        title: "Clarification question",
        plainMeaning:
          "This question is asking whether staff use personal laptops, phones or tablets to access business email, files, cloud systems or other work data.",
        whyItMatters:
          "Personal or BYOD devices can still be relevant to Cyber Essentials if they access organisational data or services. If they are missed, the organisation may underestimate which devices need basic security controls.",
        howToAnswer:
          "Briefly describe which types of personal devices are used and whether they have basic controls such as screen lock, updates, anti-malware, approved apps or access restrictions.",
        example:
          "For example: 'Some staff use personal phones for business email. Phones require screen lock and MFA, but laptops are company-owned.'",
        privacyReminder: "",
      },

      "Which cloud services store or process business data, such as email, file storage, accounting, CRM, payroll or business social media accounts?": {
        title: "Clarification question",
        plainMeaning:
          "This question is asking which online services the organisation uses for business activities, especially services that store or process business information.",
        whyItMatters:
          "Cloud services such as email, file storage, CRM, accounting, payroll and business social media accounts can be part of the Cyber Essentials scope. Missing them can make the readiness report incomplete.",
        howToAnswer:
          "List the types of cloud services used in general terms. You do not need to provide tenant names, usernames, account IDs or confidential configuration details.",
        example:
          "For example: 'We use Microsoft 365 for email and files, an online accounting system, and a hosted website platform.'",
        privacyReminder: "",
      },

      "When were firewall/router default passwords last checked, and when were firewall rules last reviewed?": {
        title: "Clarification question",
        plainMeaning:
          "This question is asking whether the organisation has checked that router or firewall default passwords have been changed, and whether firewall rules are reviewed from time to time.",
        whyItMatters:
          "Default passwords and old firewall rules can create avoidable security risks. Firewall rules should only allow access that is still needed for a clear business reason.",
        howToAnswer:
          "Say generally when this was last checked and who is responsible for reviewing it. You do not need to provide the actual password, rule list, IP addresses or technical configuration.",
        example:
          "For example: 'The router password was changed during setup, and firewall rules are reviewed by the IT provider when network changes are made.'",
        privacyReminder: "",
      },

      "Are any services intentionally accessible from the internet, and is there a documented business need for them?": {
        title: "Clarification question",
        plainMeaning:
          "This question is asking whether the organisation deliberately allows any system, service or application to be reachable from the public internet.",
        whyItMatters:
          "Internet-facing services are more exposed to attack. If they are allowed, there should be a clear business reason and the access should be reviewed.",
        howToAnswer:
          "Answer generally whether anything is intentionally exposed to the internet and whether this has been reviewed. Avoid giving IP addresses, hostnames, URLs or detailed firewall rules.",
        example:
          "For example: 'The public website is internet-facing because customers need to access it. No internal file shares or admin tools are intentionally exposed.'",
        privacyReminder: "",
      },

      "Who checks for unused applications, unnecessary services and inactive user accounts, and how often is this reviewed?": {
        title: "Clarification question",
        plainMeaning:
          "This question is asking whether someone regularly checks for software, services or user accounts that are no longer needed.",
        whyItMatters:
          "Unused applications, unnecessary services and inactive accounts increase the attack surface. Removing or disabling them reduces avoidable risk.",
        howToAnswer:
          "Briefly describe who is responsible and how often the review happens. You can describe the role or process without naming real people or internal systems.",
        example:
          "For example: 'The office manager and IT provider review inactive accounts when staff leave and check unused software during device setup.'",
        privacyReminder: "",
      },

      "Which device types use screen lock, password, PIN or biometric protection?": {
        title: "Clarification question",
        plainMeaning:
          "This question is asking which devices require some form of lock before a user can access them, such as a password, PIN, fingerprint or face recognition.",
        whyItMatters:
          "Device locking helps protect business data if a laptop, phone or tablet is lost, stolen or left unattended.",
        howToAnswer:
          "Say which types of devices use locking controls, such as laptops, desktops, phones or tablets. Do not provide actual passwords, PINs or device identifiers.",
        example:
          "For example: 'Company laptops require passwords, and phones used for business email require PIN or biometric unlock.'",
        privacyReminder: "",
      },

      "Which operating systems, applications, browsers, routers or firewalls might be unsupported or close to end of support?": {
        title: "Clarification question",
        plainMeaning:
          "This question is asking whether any software, operating systems, browsers, routers or firewalls may be too old to receive security updates.",
        whyItMatters:
          "Unsupported software may no longer receive vulnerability fixes. This can leave known security weaknesses unpatched.",
        howToAnswer:
          "Briefly say whether the organisation keeps track of software and devices, and whether anything may be old, unsupported or due for replacement.",
        example:
          "For example: 'All laptops use supported operating systems, but one older router may need to be checked for firmware support.'",
        privacyReminder: "",
      },

      "Who is responsible for checking and applying high-risk or critical updates within 14 days?": {
        title: "Clarification question",
        plainMeaning:
          "This question is asking who makes sure important security updates are checked and installed promptly, especially high-risk or critical updates.",
        whyItMatters:
          "Attackers often target known vulnerabilities after fixes are released. Applying important updates quickly reduces the time systems remain exposed.",
        howToAnswer:
          "Say who is responsible and whether updates are automatic, manually checked or handled by an IT provider. You do not need to list every device or patch.",
        example:
          "For example: 'Operating system updates are automatic, and the IT provider checks application and router updates when critical updates are announced.'",
        privacyReminder: "",
      },

      "Do any systems still use shared accounts, or does every user have their own named account?": {
        title: "Clarification question",
        plainMeaning:
          "This question is asking whether people use individual accounts or whether several people share the same login.",
        whyItMatters:
          "Named accounts make access easier to manage and review. Shared accounts make it harder to know who did what and harder to remove access when someone leaves.",
        howToAnswer:
          "Say generally whether users have their own accounts for devices and cloud services. Do not provide real usernames, email addresses or account IDs.",
        example:
          "For example: 'Each staff member has their own Microsoft 365 account, and shared accounts are not used for normal work.'",
        privacyReminder: "",
      },

      "Which accounts have administrator privileges, and are administrator accounts separate from everyday accounts?": {
        title: "Clarification question",
        plainMeaning:
          "This question is asking which accounts have administrator privileges and whether those privileged accounts are separate from normal daily-use accounts.",
        whyItMatters:
          "Administrator accounts can make major changes. Using them for email, browsing or routine work increases the damage that malware or phishing could cause.",
        howToAnswer:
          "Describe the arrangement generally. Say whether admin accounts are separate and whether they are only used for admin tasks.",
        example:
          "For example: 'The business owner has a separate admin account, and daily email is done from a standard user account.'",
        privacyReminder: "",
      },

      "For each cloud service, is MFA enabled for all users and all administrators?": {
        title: "Clarification question",
        plainMeaning:
          "This question is asking whether multi-factor authentication is enabled on cloud services for both normal users and administrator accounts.",
        whyItMatters:
          "Cloud accounts are common targets. MFA adds another check beyond the password and can reduce the risk of account compromise.",
        howToAnswer:
          "Say generally which cloud services use MFA and whether it applies to all users, only administrators or only some users.",
        example:
          "For example: 'MFA is enabled for all Microsoft 365 users and administrators, but the accounting platform still needs to be checked.'",
        privacyReminder: "",
      },

      "Which device types use anti-malware, application allow listing, approved app stores or mobile device management?": {
        title: "Clarification question",
        plainMeaning:
          "This question is asking what type of malware protection is used on different devices, such as laptops, desktops, phones or tablets.",
        whyItMatters:
          "Malware protection helps prevent malicious software from running and can reduce the chance of unsafe apps or files affecting business devices.",
        howToAnswer:
          "Briefly say which protection method is used for each device type. You do not need to provide licence keys, screenshots or detailed security settings.",
        example:
          "For example: 'Windows laptops use Microsoft Defender, phones use approved app stores, and users cannot install unknown software without approval.'",
        privacyReminder: "",
      },

      "Does the malware protection or browser configuration warn users about malicious websites?": {
        title: "Clarification question",
        plainMeaning:
          "This question is asking whether users receive warnings or protection when they try to visit known malicious or unsafe websites.",
        whyItMatters:
          "Malicious websites can be used for phishing, malware downloads or credential theft. Browser or malware protection warnings can help users avoid unsafe sites.",
        howToAnswer:
          "Say generally whether this protection exists through anti-malware, browser settings, DNS filtering or another tool. Do not provide screenshots or detailed configuration.",
        example:
          "For example: 'Microsoft Defender and browser protection are enabled, and users receive warnings for known malicious websites.'",
        privacyReminder: "",
      },
    };

    const helpContent = predefinedClarificationHelp[question];

    if (helpContent) {
      return {
        id: getClarificationHelpId(question),
        question,
        ...helpContent,
      };
    }

    return {
      id: getClarificationHelpId(question),
      title: "Clarification question",
      question,
      plainMeaning:
        "This question is asking for one extra piece of information related to your consultation answers. It helps reduce uncertainty in the readiness report.",
      whyItMatters:
        "Some answers can be interpreted in different ways. A short clarification can help the system give more specific formative guidance.",
      howToAnswer:
        "Answer briefly and generally. Focus on the process, control or responsibility being asked about. Avoid real names, usernames, IP addresses or confidential details.",
      example:
        "For example: 'This is reviewed by the person responsible for IT, and the process is checked when staff or systems change.'",
      privacyReminder: "",
    };
  };

  const activeClarificationQuestion = activeHelpId
    ? getClarificationQuestionFromHelpId(activeHelpId)
    : null;

  const activeHelpItem = activeHelpId
    ? CONSULTATION_HELP_ITEMS[activeHelpId] ??
      (activeClarificationQuestion
        ? buildClarificationHelpItem(activeClarificationQuestion)
        : null)
    : null;
  const activeHelpMessages = activeHelpId
    ? helpMessages[activeHelpId] ?? []
    : [];
  const activeHelpDraft = activeHelpId ? helpDrafts[activeHelpId] ?? "" : "";

  useEffect(() => {
    if (!consultationResult) return;

    window.requestAnimationFrame(() => {
      reportContainerRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }, [consultationResult, reportVersion]);

  useEffect(() => {
    const latestMessage = activeHelpMessages[activeHelpMessages.length - 1];

    if (!latestMessage || latestMessage.role !== "assistant") return;

    window.requestAnimationFrame(() => {
      const container = helpMessagesContainerRef.current;
      const target = latestHelpAssistantMessageRef.current;

      if (!container || !target) return;

      container.scrollTo({
        top: target.offsetTop - container.offsetTop,
        behavior: "smooth",
      });
    });
  }, [activeHelpId, activeHelpMessages]);

  const buildClarificationContext = (
    answeredClarifications?: { question: string; answer: string }[]
  ) => {
    const parts: string[] = [];

    if (additionalContext.trim()) {
      parts.push(`Initial additional context:\n${additionalContext.trim()}`);
    }

    clarificationHistory.forEach((item, index) => {
      parts.push(`Previous clarification ${index + 1}:\n${item}`);
    });

    if (answeredClarifications && answeredClarifications.length > 0) {
      const newClarificationText = answeredClarifications
        .map(
          (item, index) =>
            `Answered clarification question ${index + 1}:\nQuestion: ${item.question}\nAnswer: ${item.answer}`
        )
        .join("\n\n");

      parts.push(newClarificationText);
    }

    return parts.join("\n\n");
  };

  const buildRequestBody = (contextOverride?: string) => {
    return {
      session_id: sessionId || null,
      organisation_size: organisationSize,
      it_management: itManagement,
      devices,
      cloud_services: cloudServices,
      firewall_protection: firewallProtection,
      firewall_passwords_rules: firewallPasswordsRules,
      unnecessary_software_accounts: unnecessarySoftwareAccounts,
      device_locking: deviceLocking,
      supported_software: supportedSoftware,
      critical_updates_14_days: criticalUpdates14Days,
      unique_accounts: uniqueAccounts,
      admin_account_separation: adminAccountSeparation,
      cloud_mfa: cloudMfa,
      malware_protection: malwareProtection,
      malware_updated_blocking: malwareUpdatedBlocking,
      additional_context:
        contextOverride !== undefined ? contextOverride : additionalContext,
    };
  };

  const generateConsultationSummary = async (
    contextOverride?: string,
    isUpdate = false
  ) => {
    setLoadingConsultation(true);
    setConsultationError("");
    setReportUpdateMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/consultation/analyse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildRequestBody(contextOverride)),
      });

      if (!response.ok) {
        throw new Error(`Consultation endpoint returned ${response.status}`);
      }

      const data: ConsultationResponse = await response.json();
      setConsultationResult(data);

      if (isUpdate) {
        setReportVersion((previousVersion) => previousVersion + 1);
        setReportUpdateMessage(
          "The report has been regenerated using your latest clarification."
        );
      } else {
        setReportVersion(1);
        setPendingClarificationQuestions(data.clarification_questions ?? []);
        setClarificationAnswers({});
      }
    } catch (err) {
      setConsultationError(
        err instanceof Error
          ? err.message
          : "Failed to generate consultation summary"
      );
    } finally {
      setLoadingConsultation(false);
    }
  };

  const updateClarificationAnswer = (question: string, answer: string) => {
    setClarificationAnswers((previousAnswers) => ({
      ...previousAnswers,
      [question]: answer,
    }));
  };

  const getAnsweredClarifications = () => {
    return pendingClarificationQuestions
      .map((question) => ({
        question,
        answer: (clarificationAnswers[question] ?? "").trim(),
      }))
      .filter((item) => item.answer.length > 0);
  };

  const updateSummaryWithClarification = async () => {
    const answeredClarifications = getAnsweredClarifications();

    if (answeredClarifications.length === 0) {
      setConsultationError(
        "Please answer at least one clarification question before updating the summary."
      );
      return;
    }

    const contextForUpdate = buildClarificationContext(answeredClarifications);

    const historyEntries = answeredClarifications.map(
      (item) => `Question: ${item.question}\nAnswer: ${item.answer}`
    );

    const answeredQuestionSet = new Set(
      answeredClarifications.map((item) => item.question)
    );

    setClarificationHistory((previousHistory) => [
      ...previousHistory,
      ...historyEntries,
    ]);

    setPendingClarificationQuestions((previousQuestions) =>
      previousQuestions.filter((question) => !answeredQuestionSet.has(question))
    );

    setClarificationAnswers((previousAnswers) => {
      const remainingAnswers: Record<string, string> = {};

      Object.entries(previousAnswers).forEach(([question, answer]) => {
        if (!answeredQuestionSet.has(question)) {
          remainingAnswers[question] = answer;
        }
      });

      return remainingAnswers;
    });

    await generateConsultationSummary(contextForUpdate, true);
  };

  const resetConsultation = () => {
    setOrganisationSize("Micro business: 1-9 people");
    setItManagement("Founder / business owner");

    setDevices([]);
    setCloudServices([]);

    setFirewallProtection("Not sure");
    setFirewallPasswordsRules("Not sure");

    setUnnecessarySoftwareAccounts("Not sure");
    setDeviceLocking("Not sure");

    setSupportedSoftware("Not sure");
    setCriticalUpdates14Days("Not sure");

    setUniqueAccounts("Not sure");
    setAdminAccountSeparation("Not sure");
    setCloudMfa("Not sure");

    setMalwareProtection([]);
    setMalwareUpdatedBlocking("Not sure");

    setAdditionalContext("");
    setClarificationAnswers({});
    setClarificationHistory([]);
    setPendingClarificationQuestions([]);

    setConsultationResult(null);
    setConsultationError("");
    setReportVersion(1);
    setReportUpdateMessage("");
  };

  const getCurrentAnswerForHelp = (helpId: string): string => {
    const clarificationQuestion = getClarificationQuestionFromHelpId(helpId);

    if (clarificationQuestion) {
      return formatCurrentAnswer(clarificationAnswers[clarificationQuestion] ?? "");
    }

    if (helpId === "organisation_size") return formatCurrentAnswer(organisationSize);
    if (helpId === "it_management") return formatCurrentAnswer(itManagement);
    if (helpId === "devices") return formatCurrentAnswer(devices);
    if (helpId === "cloud_services") return formatCurrentAnswer(cloudServices);
    if (helpId === "firewall_protection")
      return formatCurrentAnswer(firewallProtection);
    if (helpId === "firewall_passwords_rules")
      return formatCurrentAnswer(firewallPasswordsRules);
    if (helpId === "unnecessary_software_accounts")
      return formatCurrentAnswer(unnecessarySoftwareAccounts);
    if (helpId === "device_locking") return formatCurrentAnswer(deviceLocking);
    if (helpId === "supported_software")
      return formatCurrentAnswer(supportedSoftware);
    if (helpId === "critical_updates_14_days")
      return formatCurrentAnswer(criticalUpdates14Days);
    if (helpId === "unique_accounts") return formatCurrentAnswer(uniqueAccounts);
    if (helpId === "admin_account_separation")
      return formatCurrentAnswer(adminAccountSeparation);
    if (helpId === "cloud_mfa") return formatCurrentAnswer(cloudMfa);
    if (helpId === "malware_protection")
      return formatCurrentAnswer(malwareProtection);
    if (helpId === "malware_updated_blocking")
      return formatCurrentAnswer(malwareUpdatedBlocking);
    if (helpId === "additional_context")
      return formatCurrentAnswer(additionalContext);

    return "No answer available.";
  };

  const openHelpModal = (helpId: string) => {
    setActiveHelpId(helpId);
    setHelpError("");
  };

  const closeHelpModal = () => {
    setActiveHelpId(null);
    setHelpError("");
  };

  const updateHelpDraft = (helpId: string, value: string) => {
    setHelpDrafts((previousDrafts) => ({
      ...previousDrafts,
      [helpId]: value,
    }));
  };

  const clearHelpConversation = (helpId: string) => {
    setHelpMessages((previousMessages) => ({
      ...previousMessages,
      [helpId]: [],
    }));

    setHelpDrafts((previousDrafts) => ({
      ...previousDrafts,
      [helpId]: "",
    }));

    setHelpError("");
  };

  const submitHelpFollowUp = async () => {
    if (!activeHelpId || !activeHelpItem) return;

    const userQuestion = activeHelpDraft.trim();

    if (!userQuestion) {
      setHelpError("Please enter a follow-up question first.");
      return;
    }

    const previousMessages = helpMessages[activeHelpId] ?? [];
    const userMessage: ConsultationHelpMessage = {
      role: "user",
      content: userQuestion,
      createdAt: new Date().toISOString(),
    };

    setHelpMessages((previousState) => ({
      ...previousState,
      [activeHelpId]: [...previousMessages, userMessage],
    }));

    setHelpDrafts((previousDrafts) => ({
      ...previousDrafts,
      [activeHelpId]: "",
    }));

    setLoadingHelpAnswer(true);
    setHelpError("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/consultation/explain-field`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            field_id: activeHelpItem.id,
            field_title: activeHelpItem.title,
            field_question: activeHelpItem.question,
            static_explanation: [
              activeHelpItem.plainMeaning,
              `Why it matters: ${activeHelpItem.whyItMatters}`,
              `How to answer: ${activeHelpItem.howToAnswer}`,
              `Example: ${activeHelpItem.example}`,
            ]
              .filter(Boolean)
              .join("\n"),
            current_answer: "",
            user_follow_up: userQuestion,
            recent_messages: previousMessages.slice(-8),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Help endpoint returned ${response.status}`);
      }

      const data: ConsultationFieldHelpResponse = await response.json();

      const assistantMessage: ConsultationHelpMessage = {
        role: "assistant",
        content: data.answer,
        createdAt: new Date().toISOString(),
      };

      setHelpMessages((previousState) => ({
        ...previousState,
        [activeHelpId]: [
          ...(previousState[activeHelpId] ?? []),
          assistantMessage,
        ],
      }));
    } catch (err) {
      setHelpError(
        err instanceof Error
          ? err.message
          : "Failed to generate the help response."
      );
    } finally {
      setLoadingHelpAnswer(false);
    }
  };

  const renderHelpButton = (helpId: string) => (
    <Button
      size="sm"
      variant="outline-info"
      onClick={() => openHelpModal(helpId)}
      style={{
        fontSize: "0.7rem",
        padding: "2px 7px",
        whiteSpace: "nowrap",
      }}
    >
      Help me understand
    </Button>
  );

  const renderQuestionHeader = (label: string, helpId: string) => (
    <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
      <Form.Label className="small mb-0">{label}</Form.Label>
      {renderHelpButton(helpId)}
    </div>
  );

  const renderHelpModal = () => (
    <Modal show={!!activeHelpItem} onHide={closeHelpModal} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: "1rem" }}>
          Help me understand
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {activeHelpItem && activeHelpId && (
          <>
            <h6 className="mb-1">{activeHelpItem.title}</h6>
            <p className="small text-muted mb-3">{activeHelpItem.question}</p>

            <Card className="mb-3 border-0 shadow-sm">
              <Card.Body className="p-3">
                <p className="small mb-2">{activeHelpItem.plainMeaning}</p>
                <p className="small mb-2">
                  <strong>Why this matters:</strong>{" "}
                  {activeHelpItem.whyItMatters}
                </p>
                <p className="small mb-2">
                  <strong>How to answer:</strong> {activeHelpItem.howToAnswer}
                </p>
                <p className="small mb-0">
                  <strong>Example:</strong> {activeHelpItem.example}
                </p>
              </Card.Body>
            </Card>


            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Ask a follow-up question</h6>
              <Button
                size="sm"
                variant="outline-secondary"
                onClick={() => clearHelpConversation(activeHelpId)}
                disabled={loadingHelpAnswer}
                style={{ fontSize: "0.7rem", padding: "2px 7px" }}
              >
                Clear conversation
              </Button>
            </div>

            <small className="text-muted d-block mb-2">
              You can ask for clarification in general terms. This chat is kept
              only while this page remains open. It is not saved to the database.
            </small>

            {activeHelpMessages.length > 0 && (
              <div
                ref={helpMessagesContainerRef}
                className="mb-3"
                style={{
                  maxHeight: "220px",
                  overflowY: "auto",
                  border: "1px solid #e5e5e5",
                  borderRadius: "8px",
                  padding: "8px",
                  background: "#fafafa",
                }}
              >
                {activeHelpMessages.map((message, index) => {
                  const isLatestAssistantMessage =
                    message.role === "assistant" &&
                    index === activeHelpMessages.length - 1;

                  return (
                    <div
                      key={`${message.role}-${message.createdAt}-${index}`}
                      ref={
                        isLatestAssistantMessage
                          ? latestHelpAssistantMessageRef
                          : undefined
                      }
                      className="mb-2"
                    >
                    <Badge
                      bg={message.role === "user" ? "primary" : "secondary"}
                      className="mb-1"
                    >
                      {message.role === "user" ? "You" : "AI help"}
                    </Badge>
                    <p
                      className="small mb-0"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {message.content}
                    </p>
                    </div>
                  );
                })}
              </div>
            )}

            {helpError && (
              <Alert variant="danger" className="small">
                {helpError}
              </Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Control
                as="textarea"
                rows={3}
                value={activeHelpDraft}
                onChange={(event) =>
                  updateHelpDraft(activeHelpId, event.target.value)
                }
                placeholder="Example: I use my personal laptop to check company email. Does that count as BYOD?"
              />
            </Form.Group>

            <Button
              size="sm"
              variant="primary"
              onClick={submitHelpFollowUp}
              disabled={loadingHelpAnswer || activeHelpDraft.trim().length === 0}
              style={{ width: "100%" }}
            >
              {loadingHelpAnswer ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Generating explanation...
                </>
              ) : (
                "Ask AI for clarification"
              )}
            </Button>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button size="sm" variant="secondary" onClick={closeHelpModal}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );

  if (consultationResult) {
    return (
      <>
        {renderHelpModal()}

        <div
          ref={reportContainerRef}
          style={{
            height: "calc(100vh - 190px)",
            overflowY: "auto",
            paddingRight: "4px",
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              <h6 className="mb-0">Consultation Report</h6>
              <small className="text-muted">
                Formative Cyber Essentials readiness guidance.
              </small>
            </div>

            <Button
              size="sm"
              variant="outline-secondary"
              onClick={resetConsultation}
              disabled={loadingConsultation}
              style={{
                fontSize: "0.72rem",
                padding: "4px 7px",
                whiteSpace: "nowrap",
              }}
            >
              Try Again
            </Button>
          </div>

          {consultationError && (
            <Alert variant="danger" className="small">
              {consultationError}
            </Alert>
          )}

          {loadingConsultation && (
            <Alert variant="info" className="small">
              <Spinner animation="border" size="sm" className="me-2" />
              Updating consultation summary...
            </Alert>
          )}

          {reportUpdateMessage && (
            <Alert variant="success" className="small">
              <strong>Report regenerated.</strong>
              <p className="mb-0 mt-2">
                {reportUpdateMessage} Current report version: {reportVersion}.
              </p>
            </Alert>
          )}

          <Card className="mb-3 border-0 shadow-sm">
            <Card.Body className="p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Cyber Essentials Readiness Summary</h6>
                <Badge
                  bg={getReadinessVariant(consultationResult.overall_readiness)}
                  text={getReadinessTextColour(
                    consultationResult.overall_readiness
                  )}
                >
                  {consultationResult.overall_readiness} readiness
                </Badge>
              </div>

              <p className="small mb-0">{consultationResult.summary}</p>
            </Card.Body>
          </Card>

          {consultationResult.strengths.length > 0 && (
            <Alert variant="success" className="small">
              <strong>Likely strengths</strong>
              <ul className="mb-0 mt-2">
                {consultationResult.strengths.map((strength, index) => (
                  <li key={`strength-${index}`}>
                    <strong>{strength.control}:</strong> {strength.point}
                  </li>
                ))}
              </ul>
            </Alert>
          )}

          {consultationResult.potential_gaps.length > 0 && (
            <>
              <h6>Potential gaps</h6>

              {consultationResult.potential_gaps.map((gap, index) => (
                <Card key={`gap-${index}`} className="mb-3 border-0 shadow-sm">
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <h6 className="mb-1">{gap.control}</h6>
                        <small className="text-muted">
                          {gap.related_reference}
                        </small>
                      </div>

                      <Badge
                        bg={getSeverityVariant(gap.severity)}
                        text={getSeverityTextColour(gap.severity)}
                      >
                        {gap.severity}
                      </Badge>
                    </div>

                    <p className="small mb-2">
                      <strong>Issue:</strong> {gap.issue}
                    </p>

                    <p className="small mb-2">
                      <strong>Why it matters:</strong> {gap.why_it_matters}
                    </p>

                    <Alert variant="light" className="small mb-0">
                      <strong>Recommended action:</strong>{" "}
                      {gap.recommended_action}
                    </Alert>
                  </Card.Body>
                </Card>
              ))}
            </>
          )}

          {consultationResult.recommended_next_steps.length > 0 && (
            <Alert variant="info" className="small">
              <strong>Recommended next steps</strong>
              <ol className="mb-0 mt-2">
                {consultationResult.recommended_next_steps.map((step, index) => (
                  <li key={`step-${index}`}>{step}</li>
                ))}
              </ol>
            </Alert>
          )}

          {clarificationHistory.length > 0 && (
            <Card className="mb-3 border-0 shadow-sm">
              <Card.Body className="p-3">
                <h6>Clarifications already added</h6>
                <small className="text-muted d-block mb-2">
                  These answers have been used to regenerate the current report.
                </small>

                {clarificationHistory.map((item, index) => (
                  <Alert
                    key={`history-${index}`}
                    variant="light"
                    className="small mb-2"
                  >
                    <strong>Clarification {index + 1}:</strong>
                    <p className="mb-0 mt-1" style={{ whiteSpace: "pre-wrap" }}>
                      {item}
                    </p>
                  </Alert>
                ))}
              </Card.Body>
            </Card>
          )}

          {pendingClarificationQuestions.length > 0 && (
            <Card className="mb-3 border-0 shadow-sm">
              <Card.Body className="p-3">
                <h6>Questions to clarify</h6>
                <small className="text-muted d-block mb-2">
                  These questions are generated once from the initial
                  consultation result. Answer any of them below; answered
                  questions will be removed after the report is regenerated.
                </small>

                {pendingClarificationQuestions.map((question, index) => {
                  const clarificationHelpId = getClarificationHelpId(question);

                  return (
                    <Form.Group
                      key={`pending-question-${index}`}
                      className="mb-3"
                    >
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                        <Form.Label
                          className="small mb-0"
                          style={{ flex: 1 }}
                        >
                          <strong>
                            Question {index + 1} of{" "}
                            {pendingClarificationQuestions.length}
                          </strong>
                          <br />
                          {question}
                        </Form.Label>
                        {renderHelpButton(clarificationHelpId)}
                      </div>

                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={clarificationAnswers[question] ?? ""}
                        onChange={(event) =>
                          updateClarificationAnswer(question, event.target.value)
                        }
                        placeholder="Add your answer in general terms. Do not include sensitive details."
                      />
                    </Form.Group>
                  );
                })}

                <Button
                  size="sm"
                  variant="primary"
                  onClick={updateSummaryWithClarification}
                  disabled={
                    loadingConsultation || getAnsweredClarifications().length === 0
                  }
                  style={{ width: "100%" }}
                >
                  {loadingConsultation ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Updating Summary...
                    </>
                  ) : (
                    "Update Summary with Answered Clarifications"
                  )}
                </Button>
              </Card.Body>
            </Card>
          )}

          {pendingClarificationQuestions.length === 0 &&
            clarificationHistory.length > 0 && (
              <Alert variant="success" className="small">
                <strong>All clarification questions have been answered.</strong>
                <p className="mb-0 mt-2">
                  The current report has been regenerated using the clarification
                  details you provided.
                </p>
              </Alert>
            )}

          {consultationResult.sources.length > 0 && (
            <details className="mb-3">
              <summary className="small fw-semibold">Sources used</summary>

              <ListGroup className="mt-2">
                {consultationResult.sources.slice(0, 3).map((source) => (
                  <ListGroup.Item key={source.id}>
                    <div className="small">
                      <strong>{source.section_title ?? "Unknown section"}</strong>
                      {source.page_number && (
                        <span> — source page {source.page_number}</span>
                      )}
                    </div>

                    {source.similarity !== null && (
                      <small className="text-muted">
                        Similarity: {source.similarity.toFixed(3)}
                      </small>
                    )}

                    <p className="mb-0 mt-2">
                      <small>{source.content_preview.slice(0, 150)}...</small>
                    </p>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </details>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {renderHelpModal()}

      <div
        style={{
          height: "calc(100vh - 190px)",
          overflowY: "auto",
          paddingRight: "4px",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div>
            <h6 className="mb-0">Consultation</h6>
            <small className="text-muted">
              Short Cyber Essentials readiness consultation for small
              organisations.
            </small>
          </div>
        </div>

        <Alert variant="warning" className="small">
          This feature provides formative Cyber Essentials readiness guidance
          only. Do not enter real company names, employee names, IP addresses,
          passwords, credentials, internal configurations or confidential security
          details.
        </Alert>

        {consultationError && (
          <Alert variant="danger" className="small">
            {consultationError}
          </Alert>
        )}

        <Card className="mb-3 border-0 shadow-sm">
          <Card.Body className="p-3">
            <h6>1. Organisation and scope</h6>

            <Form.Group className="mb-3">
              {renderQuestionHeader(
                "What best describes your organisation?",
                "organisation_size"
              )}
              <Form.Select
                size="sm"
                value={organisationSize}
                onChange={(event) => setOrganisationSize(event.target.value)}
              >
                <option>Micro business: 1-9 people</option>
                <option>Small business: 10-49 people</option>
                <option>Medium business: 50-249 people</option>
                <option>Larger organisation: 250+ people</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              {renderQuestionHeader(
                "Who mainly manages your IT systems?",
                "it_management"
              )}
              <Form.Select
                size="sm"
                value={itManagement}
                onChange={(event) => setItManagement(event.target.value)}
              >
                <option>Founder / business owner</option>
                <option>Internal IT staff</option>
                <option>External IT provider</option>
                <option>Mixed</option>
                <option>Not sure</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              {renderQuestionHeader(
                "Which devices access business data or services?",
                "devices"
              )}

              <div style={{ display: "grid", gap: "4px" }}>
                {DEVICE_OPTIONS.map((option) => (
                  <Form.Check
                    key={option}
                    type="checkbox"
                    label={option}
                    checked={devices.includes(option)}
                    onChange={() => toggleListValue(devices, option, setDevices)}
                    className="small"
                  />
                ))}
              </div>
            </Form.Group>

            <Form.Group>
              {renderQuestionHeader(
                "Which cloud services are used?",
                "cloud_services"
              )}

              <div style={{ display: "grid", gap: "4px" }}>
                {CLOUD_SERVICE_OPTIONS.map((option) => (
                  <Form.Check
                    key={option}
                    type="checkbox"
                    label={option}
                    checked={cloudServices.includes(option)}
                    onChange={() =>
                      toggleListValue(cloudServices, option, setCloudServices)
                    }
                    className="small"
                  />
                ))}
              </div>
            </Form.Group>
          </Card.Body>
        </Card>

        <Card className="mb-3 border-0 shadow-sm">
          <Card.Body className="p-3">
            <h6>2. Firewalls</h6>

            <Form.Group className="mb-3">
              {renderQuestionHeader(
                "Are all office networks and devices protected by a firewall?",
                "firewall_protection"
              )}
              <Form.Select
                size="sm"
                value={firewallProtection}
                onChange={(event) => setFirewallProtection(event.target.value)}
              >
                <option>Yes</option>
                <option>Partly</option>
                <option>No</option>
                <option>Not sure</option>
              </Form.Select>
            </Form.Group>

            <Form.Group>
              {renderQuestionHeader(
                "Are firewall/router default passwords changed and are firewall rules reviewed?",
                "firewall_passwords_rules"
              )}
              <Form.Select
                size="sm"
                value={firewallPasswordsRules}
                onChange={(event) =>
                  setFirewallPasswordsRules(event.target.value)
                }
              >
                <option>Yes, both are done</option>
                <option>Passwords changed, but rules are not reviewed</option>
                <option>Rules reviewed, but password status is unclear</option>
                <option>No</option>
                <option>Not sure</option>
              </Form.Select>
            </Form.Group>
          </Card.Body>
        </Card>

        <Card className="mb-3 border-0 shadow-sm">
          <Card.Body className="p-3">
            <h6>3. Secure Configuration</h6>

            <Form.Group className="mb-3">
              {renderQuestionHeader(
                "Are unnecessary applications, services and user accounts removed or disabled?",
                "unnecessary_software_accounts"
              )}
              <Form.Select
                size="sm"
                value={unnecessarySoftwareAccounts}
                onChange={(event) =>
                  setUnnecessarySoftwareAccounts(event.target.value)
                }
              >
                <option>Yes</option>
                <option>Partly</option>
                <option>No</option>
                <option>Not sure</option>
              </Form.Select>
            </Form.Group>

            <Form.Group>
              {renderQuestionHeader(
                "Are devices protected by screen lock, password, PIN or biometric access?",
                "device_locking"
              )}
              <Form.Select
                size="sm"
                value={deviceLocking}
                onChange={(event) => setDeviceLocking(event.target.value)}
              >
                <option>Yes, on all devices</option>
                <option>Some devices only</option>
                <option>No</option>
                <option>Not sure</option>
              </Form.Select>
            </Form.Group>
          </Card.Body>
        </Card>

        <Card className="mb-3 border-0 shadow-sm">
          <Card.Body className="p-3">
            <h6>4. Security Update Management</h6>

            <Form.Group className="mb-3">
              {renderQuestionHeader(
                "Are all operating systems, applications, browsers, routers and firewalls still supported?",
                "supported_software"
              )}
              <Form.Select
                size="sm"
                value={supportedSoftware}
                onChange={(event) => setSupportedSoftware(event.target.value)}
              >
                <option>Yes</option>
                <option>Some may be unsupported</option>
                <option>No</option>
                <option>Not sure</option>
              </Form.Select>
            </Form.Group>

            <Form.Group>
              {renderQuestionHeader(
                "Are high-risk or critical security updates normally installed within 14 days?",
                "critical_updates_14_days"
              )}
              <Form.Select
                size="sm"
                value={criticalUpdates14Days}
                onChange={(event) =>
                  setCriticalUpdates14Days(event.target.value)
                }
              >
                <option>Yes</option>
                <option>Sometimes</option>
                <option>No</option>
                <option>Not sure</option>
              </Form.Select>
            </Form.Group>
          </Card.Body>
        </Card>

        <Card className="mb-3 border-0 shadow-sm">
          <Card.Body className="p-3">
            <h6>5. User Access Control</h6>

            <Form.Group className="mb-3">
              {renderQuestionHeader(
                "Does every user have their own account, instead of shared accounts?",
                "unique_accounts"
              )}
              <Form.Select
                size="sm"
                value={uniqueAccounts}
                onChange={(event) => setUniqueAccounts(event.target.value)}
              >
                <option>Yes</option>
                <option>Some shared accounts exist</option>
                <option>No</option>
                <option>Not sure</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              {renderQuestionHeader(
                "Are administrator accounts separate from everyday user accounts?",
                "admin_account_separation"
              )}
              <Form.Select
                size="sm"
                value={adminAccountSeparation}
                onChange={(event) =>
                  setAdminAccountSeparation(event.target.value)
                }
              >
                <option>Yes</option>
                <option>Partly</option>
                <option>No</option>
                <option>Not sure</option>
              </Form.Select>
            </Form.Group>

            <Form.Group>
              {renderQuestionHeader(
                "Is MFA enabled for cloud services where available?",
                "cloud_mfa"
              )}
              <Form.Select
                size="sm"
                value={cloudMfa}
                onChange={(event) => setCloudMfa(event.target.value)}
              >
                <option>Yes, for all users and administrators</option>
                <option>Only for administrators</option>
                <option>Only for some users</option>
                <option>No</option>
                <option>Not sure</option>
                <option>No cloud services</option>
              </Form.Select>
            </Form.Group>
          </Card.Body>
        </Card>

        <Card className="mb-3 border-0 shadow-sm">
          <Card.Body className="p-3">
            <h6>6. Malware Protection</h6>

            <Form.Group className="mb-3">
              {renderQuestionHeader(
                "How are devices protected from malware?",
                "malware_protection"
              )}

              <div style={{ display: "grid", gap: "4px" }}>
                {MALWARE_PROTECTION_OPTIONS.map((option) => (
                  <Form.Check
                    key={option}
                    type="checkbox"
                    label={option}
                    checked={malwareProtection.includes(option)}
                    onChange={() =>
                      toggleListValue(
                        malwareProtection,
                        option,
                        setMalwareProtection
                      )
                    }
                    className="small"
                  />
                ))}
              </div>
            </Form.Group>

            <Form.Group>
              {renderQuestionHeader(
                "Is malware protection kept updated and configured to block malicious activity?",
                "malware_updated_blocking"
              )}
              <Form.Select
                size="sm"
                value={malwareUpdatedBlocking}
                onChange={(event) =>
                  setMalwareUpdatedBlocking(event.target.value)
                }
              >
                <option>Yes</option>
                <option>Partly</option>
                <option>No</option>
                <option>Not sure</option>
              </Form.Select>
            </Form.Group>
          </Card.Body>
        </Card>

        <Card className="mb-3 border-0 shadow-sm">
          <Card.Body className="p-3">
            <h6>Additional context</h6>

            <Form.Group>
              {renderQuestionHeader(
                "Describe any extra setup details in general terms.",
                "additional_context"
              )}
              <Form.Control
                as="textarea"
                rows={4}
                value={additionalContext}
                onChange={(event) => setAdditionalContext(event.target.value)}
                placeholder="Example: We use Microsoft 365, staff work from home, laptops are company-owned, IT is managed by an external provider, but we are not sure whether MFA is enabled for all users."
              />
            </Form.Group>
          </Card.Body>
        </Card>

        <Button
          size="sm"
          onClick={() => generateConsultationSummary()}
          disabled={loadingConsultation}
          style={{ width: "100%", marginBottom: "14px" }}
        >
          {loadingConsultation ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Generating Consultation Summary...
            </>
          ) : (
            "Generate Consultation Summary"
          )}
        </Button>
      </div>
    </>
  );
}

export default ConsultationTab;
