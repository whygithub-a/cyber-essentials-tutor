import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Form,
  ListGroup,
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

function ConsultationTab({ apiBaseUrl, sessionId }: ConsultationTabProps) {
  const reportContainerRef = useRef<HTMLDivElement | null>(null);

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
  const [clarificationHistory, setClarificationHistory] = useState<string[]>([]);
  const [pendingClarificationQuestions, setPendingClarificationQuestions] =
    useState<string[]>([]);

  const [consultationResult, setConsultationResult] =
    useState<ConsultationResponse | null>(null);
  const [loadingConsultation, setLoadingConsultation] = useState(false);
  const [consultationError, setConsultationError] = useState("");
  const [reportVersion, setReportVersion] = useState(1);
  const [reportUpdateMessage, setReportUpdateMessage] = useState("");

  useEffect(() => {
    if (!consultationResult) return;

    window.requestAnimationFrame(() => {
      reportContainerRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }, [consultationResult, reportVersion]);

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
        setPendingClarificationQuestions(data.clarification_questions ?? {});
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

  if (consultationResult) {
    return (
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
                These questions are generated once from the initial consultation
                result. Answer any of them below; answered questions will be
                removed after the report is regenerated.
              </small>

              {pendingClarificationQuestions.map((question, index) => (
                <Form.Group
                  key={`pending-question-${index}`}
                  className="mb-3"
                >
                  <Form.Label className="small">
                    <strong>
                      Question {index + 1} of{" "}
                      {pendingClarificationQuestions.length}
                    </strong>
                    <br />
                    {question}
                  </Form.Label>
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
              ))}

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
    );
  }

  return (
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
        This feature provides formative Cyber Essentials readiness guidance only.
        Do not enter real company names, employee names, IP addresses, passwords,
        credentials, internal configurations or confidential security details.
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
            <Form.Label className="small">
              What best describes your organisation?
            </Form.Label>
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
            <Form.Label className="small">
              Who mainly manages your IT systems?
            </Form.Label>
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
            <Form.Label className="small">
              Which devices access business data or services?
            </Form.Label>

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
            <Form.Label className="small">
              Which cloud services are used?
            </Form.Label>

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
            <Form.Label className="small">
              Are all office networks and devices protected by a firewall?
            </Form.Label>
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
            <Form.Label className="small">
              Are firewall/router default passwords changed and are firewall
              rules reviewed?
            </Form.Label>
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
            <Form.Label className="small">
              Are unnecessary applications, services and user accounts removed or
              disabled?
            </Form.Label>
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
            <Form.Label className="small">
              Are devices protected by screen lock, password, PIN or biometric
              access?
            </Form.Label>
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
            <Form.Label className="small">
              Are all operating systems, applications, browsers, routers and
              firewalls still supported?
            </Form.Label>
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
            <Form.Label className="small">
              Are high-risk or critical security updates normally installed
              within 14 days?
            </Form.Label>
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
            <Form.Label className="small">
              Does every user have their own account, instead of shared
              accounts?
            </Form.Label>
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
            <Form.Label className="small">
              Are administrator accounts separate from everyday user accounts?
            </Form.Label>
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
            <Form.Label className="small">
              Is MFA enabled for cloud services where available?
            </Form.Label>
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
            <Form.Label className="small">
              How are devices protected from malware?
            </Form.Label>

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
            <Form.Label className="small">
              Is malware protection kept updated and configured to block
              malicious activity?
            </Form.Label>
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
            <Form.Label className="small">
              Describe any extra setup details in general terms.
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={additionalContext}
              onChange={(event) => setAdditionalContext(event.target.value)}
              placeholder="Example: We use Microsoft 365, staff work from home, laptops are company-owned, IT is managed by an external provider, but we are not sure whether MFA is enabled for all users."
            />
            <Form.Text className="text-muted">
              Do not include real names, IP addresses, usernames, passwords,
              credentials or confidential configurations.
            </Form.Text>
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
  );
}

export default ConsultationTab;