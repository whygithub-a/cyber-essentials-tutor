import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Form,
  ListGroup,
  ProgressBar,
  Spinner,
  Tab,
  Tabs,
} from "react-bootstrap";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const PDF_PATH =
  "/documents/cyber-essentials-requirements-for-it-infrastructure-v3-3.pdf";

type LearningSection = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  page: number;
  topicId: string | null;
};

const LEARNING_SECTIONS: LearningSection[] = [
  {
    id: "definitions",
    title: "Definitions",
    shortTitle: "Definitions",
    description: "Key terminology used in the Cyber Essentials requirements.",
    page: 5,
    topicId: null,
  },
  {
    id: "scope",
    title: "Scope",
    shortTitle: "Scope",
    description: "Cyber Essentials scope, asset inclusion and boundaries.",
    page: 7,
    topicId: null,
  },
  {
    id: "firewalls",
    title: "Firewalls",
    shortTitle: "Firewalls",
    description: "Firewall requirements and network access controls.",
    page: 14,
    topicId: "firewalls",
  },
  {
    id: "secure_configuration",
    title: "Secure Configuration",
    shortTitle: "Configuration",
    description: "Secure setup and configuration of devices and software.",
    page: 15,
    topicId: "secure_configuration",
  },
  {
    id: "security_update_management",
    title: "Security Update Management",
    shortTitle: "Updates",
    description: "Supported software, updates, vulnerabilities and patches.",
    page: 17,
    topicId: "security_update_management",
  },
  {
    id: "user_access_control",
    title: "User Access Control",
    shortTitle: "Access Control",
    description: "User accounts, privileges and authentication.",
    page: 19,
    topicId: "user_access_control",
  },
  {
    id: "malware_protection",
    title: "Malware Protection",
    shortTitle: "Malware",
    description: "Protection against malware and malicious software.",
    page: 24,
    topicId: "malware_protection",
  },
];

type SourceItem = {
  id: string;
  topic_id: string | null;
  section_title: string | null;
  page_number: number | null;
  similarity: number | null;
  content_preview: string;
};

type ChatResponse = {
  answer: string;
  sources: SourceItem[];
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: SourceItem[];
};

type AssessmentQuestion = {
  id: string;
  topic_id: string;
  question_text: string;
  scenario_context: string | null;
  difficulty: string | null;
};

type AssessmentResponse = {
  score: number;
  max_score: number;
  strengths: string[];
  missing_points: string[];
  feedback: string;
  sources: SourceItem[];
};

type ProgressItem = {
  session_id: string;
  topic_id: string;
  completed: boolean;
  latest_score: number | null;
  max_score: number | null;
  badge_awarded: string | null;
  updated_at: string | null;
};

type ProgressResponse = {
  session_id: string;
  progress: ProgressItem[];
};

const SESSION_STORAGE_KEY = "cyber_tutor_session_id";

function getOrCreateSessionId(): string {
  const existingSessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (existingSessionId) {
    return existingSessionId;
  }

  const newSessionId = `anon_${crypto.randomUUID()}`;
  window.localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);

  return newSessionId;
}

function formatBadgeLabel(badge: string | null): string {
  if (badge === "strong_understanding") return "Strong";
  if (badge === "developing_understanding") return "Developing";
  if (badge === "needs_review") return "Review";
  if (badge === "completed") return "Completed";
  return "Not done";
}

function getBadgeVariant(badge: string | null): string {
  if (badge === "strong_understanding") return "success";
  if (badge === "developing_understanding") return "primary";
  if (badge === "needs_review") return "warning";
  if (badge === "completed") return "info";
  return "secondary";
}

function App() {
  const [selectedSection, setSelectedSection] = useState<LearningSection>(
    LEARNING_SECTIONS[0]
  );

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [chatError, setChatError] = useState("");

  const [assessmentQuestion, setAssessmentQuestion] =
    useState<AssessmentQuestion | null>(null);
  const [assessmentAnswer, setAssessmentAnswer] = useState("");
  const [assessmentResult, setAssessmentResult] =
    useState<AssessmentResponse | null>(null);
  const [loadingAssessmentQuestion, setLoadingAssessmentQuestion] =
    useState(false);
  const [submittingAssessment, setSubmittingAssessment] = useState(false);
  const [assessmentError, setAssessmentError] = useState("");

  const [sessionId, setSessionId] = useState("");
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [progressError, setProgressError] = useState("");

  const pdfUrl = `${PDF_PATH}#page=${selectedSection.page}&zoom=60`;
  const assessableSections = LEARNING_SECTIONS.filter(
    (section) => section.topicId
  );
  const completedCount = progressItems.filter((item) => item.completed).length;
  const progressPercentage =
    assessableSections.length > 0
      ? Math.round((completedCount / assessableSections.length) * 100)
      : 0;

  const loadProgress = async (activeSessionId: string) => {
    if (!activeSessionId) return;

    setLoadingProgress(true);
    setProgressError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/progress/${activeSessionId}`
      );

      if (!response.ok) {
        throw new Error(`Progress endpoint returned ${response.status}`);
      }

      const data: ProgressResponse = await response.json();
      setProgressItems(data.progress);
    } catch (err) {
      setProgressError(
        err instanceof Error ? err.message : "Failed to load progress"
      );
    } finally {
      setLoadingProgress(false);
    }
  };

  const updateProgress = async (
    topicId: string,
    latestScore: number,
    maxScore: number
  ) => {
    const activeSessionId = sessionId || getOrCreateSessionId();

    if (!sessionId) {
      setSessionId(activeSessionId);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/progress/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: activeSessionId,
          topic_id: topicId,
          completed: true,
          latest_score: latestScore,
          max_score: maxScore,
        }),
      });

      if (!response.ok) {
        throw new Error(`Progress update endpoint returned ${response.status}`);
      }

      await loadProgress(activeSessionId);
    } catch (err) {
      setProgressError(
        err instanceof Error ? err.message : "Failed to update progress"
      );
    }
  };

  const getProgressForTopic = (topicId: string): ProgressItem | undefined => {
    return progressItems.find((item) => item.topic_id === topicId);
  };

  const loadAssessmentQuestion = async (section: LearningSection) => {
    setAssessmentQuestion(null);
    setAssessmentAnswer("");
    setAssessmentResult(null);
    setAssessmentError("");

    if (!section.topicId) return;

    setLoadingAssessmentQuestion(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/assessment/question/${section.topicId}`
      );

      if (!response.ok) {
        throw new Error(
          `Assessment question endpoint returned ${response.status}`
        );
      }

      const data: AssessmentQuestion = await response.json();
      setAssessmentQuestion(data);
    } catch (err) {
      setAssessmentError(
        err instanceof Error ? err.message : "Failed to load assessment question"
      );
    } finally {
      setLoadingAssessmentQuestion(false);
    }
  };

  const selectSection = (section: LearningSection) => {
    setSelectedSection(section);
    setMessages([]);
    setQuestion("");
    setChatError("");
    loadAssessmentQuestion(section);
  };

  const askTutor = async () => {
    if (!question.trim()) return;

    const userQuestion = question.trim();

    setMessages((previousMessages) => [
      ...previousMessages,
      { role: "user", content: userQuestion },
    ]);

    setQuestion("");
    setLoadingAnswer(true);
    setChatError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userQuestion,
          topic_id: selectedSection.topicId,
          match_count: 4,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat endpoint returned ${response.status}`);
      }

      const data: ChatResponse = await response.json();

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
        },
      ]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Failed to get AI answer");
    } finally {
      setLoadingAnswer(false);
    }
  };

  const submitAssessment = async () => {
    if (!assessmentQuestion) return;

    if (!assessmentAnswer.trim()) {
      setAssessmentError("Please write an answer before submitting.");
      return;
    }

    setSubmittingAssessment(true);
    setAssessmentError("");
    setAssessmentResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/assessment/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_id: assessmentQuestion.id,
          user_answer: assessmentAnswer.trim(),
          match_count: 4,
        }),
      });

      if (!response.ok) {
        throw new Error(`Assessment submit endpoint returned ${response.status}`);
      }

      const data: AssessmentResponse = await response.json();
      setAssessmentResult(data);

      if (selectedSection.topicId) {
        await updateProgress(
          selectedSection.topicId,
          data.score,
          data.max_score
        );
      }
    } catch (err) {
      setAssessmentError(
        err instanceof Error ? err.message : "Failed to submit assessment answer"
      );
    } finally {
      setSubmittingAssessment(false);
    }
  };

  useEffect(() => {
    const activeSessionId = getOrCreateSessionId();
    setSessionId(activeSessionId);
    loadProgress(activeSessionId);
  }, []);

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "#eef1f5",
        display: "grid",
        gridTemplateRows: "58px 1fr",
      }}
    >
      <header
        style={{
          background: "white",
          borderBottom: "1px solid #d8dee8",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
        }}
      >
        <div>
          <h5 style={{ margin: 0 }}>
            Cyber Essentials Intelligent Tutoring System
          </h5>
          <small className="text-muted">
            PDF learning, grounded AI tutoring, formative assessment and progress tracking
          </small>
        </div>

        <Badge bg="warning" text="dark" style={{ fontSize: "0.8rem" }}>
          Learning prototype only — not an official certification decision tool
        </Badge>
      </header>

      <main
        style={{
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "230px minmax(560px, 1fr) 390px",
          gap: "12px",
          padding: "12px",
        }}
      >
        <aside style={{ minHeight: 0 }}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                padding: "14px",
                overflow: "hidden",
              }}
            >
              <div style={{ marginBottom: "10px", textAlign: "center" }}>
                <h6 className="mb-1">Learning Sections</h6>
                <small className="text-muted">
                  Select a section to open the PDF.
                </small>
              </div>

              <ListGroup variant="flush" style={{ marginBottom: "12px" }}>
                {LEARNING_SECTIONS.map((section) => (
                  <ListGroup.Item
                    key={section.id}
                    action
                    active={selectedSection.id === section.id}
                    onClick={() => selectSection(section)}
                    style={{
                      padding: "10px 8px",
                      borderRadius: "8px",
                      marginBottom: "4px",
                      textAlign: "center",
                      fontWeight: 600,
                    }}
                  >
                    {section.shortTitle}
                  </ListGroup.Item>
                ))}
              </ListGroup>

              <div style={{ borderTop: "1px solid #e1e5ea", paddingTop: "12px" }}>
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">Progress</h6>
                  <Badge bg="primary">{progressPercentage}%</Badge>
                </div>
                <small className="text-muted">
                  {completedCount}/{assessableSections.length} assessments completed
                </small>

                <ProgressBar now={progressPercentage} className="my-2" />

                {progressError && (
                  <Alert variant="warning" className="py-1 px-2 small">
                    {progressError}
                  </Alert>
                )}

                {loadingProgress ? (
                  <small className="text-muted">
                    <Spinner animation="border" size="sm" className="me-1" />
                    Loading...
                  </small>
                ) : (
                  <div style={{ display: "grid", gap: "6px", marginTop: "8px" }}>
                    {assessableSections.map((section) => {
                      const progress = getProgressForTopic(section.topicId!);

                      return (
                        <div
                          key={`progress-${section.id}`}
                          className="d-flex justify-content-between align-items-center"
                        >
                          <small>{section.shortTitle}</small>
                          <Badge
                            bg={getBadgeVariant(progress?.badge_awarded ?? null)}
                          >
                            {progress
                              ? `${progress.latest_score}/${progress.max_score}`
                              : formatBadgeLabel(null)}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {sessionId && (
                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: "12px",
                    borderTop: "1px solid #e1e5ea",
                  }}
                >
                  <small className="text-muted">
                    Session: {sessionId.slice(0, 16)}...
                  </small>
                </div>
              )}
            </Card.Body>
          </Card>
        </aside>

        <section style={{ minHeight: 0 }}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body
              style={{
                height: "100%",
                display: "grid",
                gridTemplateRows: "58px 1fr",
                padding: "14px",
                minHeight: 0,
              }}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h5 className="mb-1">{selectedSection.title}</h5>
                  <small className="text-muted">
                    {selectedSection.description}
                  </small>
                </div>
              </div>

              <div
                style={{
                  minHeight: 0,
                  border: "1px solid #d8dee8",
                  borderRadius: "12px",
                  overflow: "hidden",
                  background: "white",
                }}
              >
                <iframe
                  key={pdfUrl}
                  src={pdfUrl}
                  title="Cyber Essentials PDF"
                  width="100%"
                  height="100%"
                  style={{ border: "none" }}
                />
              </div>
            </Card.Body>
          </Card>
        </section>

        <aside style={{ minHeight: 0 }}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                padding: "14px",
                minHeight: 0,
              }}
            >
              <Tabs defaultActiveKey="tutor" className="mb-3" fill>
                <Tab eventKey="tutor" title="AI Tutor">
                  <div
                    style={{
                      display: "grid",
                      gridTemplateRows: "auto minmax(220px, 1fr) auto",
                      height: "calc(100vh - 190px)",
                      minHeight: 0,
                    }}
                  >
                    <div>
                      <small className="text-muted d-block mb-2">
                        Ask questions grounded in retrieved Cyber Essentials content.
                      </small>

                      {chatError && <Alert variant="danger">{chatError}</Alert>}
                    </div>

                    <div
                      style={{
                        minHeight: 0,
                        overflowY: "auto",
                        border: "1px solid #d8dee8",
                        borderRadius: "12px",
                        padding: "12px",
                        background: "#f8f9fa",
                        marginBottom: "12px",
                      }}
                    >
                      {messages.length === 0 && (
                        <Alert variant="secondary" className="mb-0 small">
                          Try asking:{" "}
                          <strong>
                            What should an organisation do when an employee leaves?
                          </strong>
                        </Alert>
                      )}

                      {messages.map((message, index) => (
                        <Card
                          key={`${message.role}-${index}`}
                          className="mb-3 border-0 shadow-sm"
                        >
                          <Card.Body className="p-3">
                            <Badge
                              bg={message.role === "user" ? "primary" : "success"}
                              className="mb-2"
                            >
                              {message.role === "user" ? "You" : "AI Tutor"}
                            </Badge>

                            <Card.Text
                              className="small"
                              style={{ whiteSpace: "pre-wrap" }}
                            >
                              {message.content}
                            </Card.Text>

                            {message.sources && message.sources.length > 0 && (
                              <details>
                                <summary className="small fw-semibold">
                                  Sources used
                                </summary>

                                <ListGroup className="mt-2">
                                  {message.sources.slice(0, 3).map((source) => (
                                    <ListGroup.Item key={source.id}>
                                      <div className="small">
                                        <strong>
                                          {source.section_title ?? "Unknown section"}
                                        </strong>
                                        {source.page_number && (
                                          <span>
                                            {" "}
                                            — source page {source.page_number}
                                          </span>
                                        )}
                                      </div>

                                      {source.similarity !== null && (
                                        <small className="text-muted">
                                          Similarity:{" "}
                                          {source.similarity.toFixed(3)}
                                        </small>
                                      )}

                                      <p className="mb-0 mt-2">
                                        <small>
                                          {source.content_preview.slice(0, 150)}...
                                        </small>
                                      </p>
                                    </ListGroup.Item>
                                  ))}
                                </ListGroup>
                              </details>
                            )}
                          </Card.Body>
                        </Card>
                      ))}

                      {loadingAnswer && (
                        <Alert variant="info" className="mb-0 small">
                          <Spinner animation="border" size="sm" className="me-2" />
                          Retrieving context and generating an answer...
                        </Alert>
                      )}
                    </div>

                    <Form
                      onSubmit={(event) => {
                        event.preventDefault();
                        askTutor();
                      }}
                    >
                      <Form.Group className="mb-2">
                        <Form.Label className="small">Your question</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={question}
                          onChange={(event) => setQuestion(event.target.value)}
                          placeholder="Ask a question..."
                        />
                      </Form.Group>

                      <Button
                        type="submit"
                        size="sm"
                        disabled={loadingAnswer || !question.trim()}
                      >
                        Ask AI Tutor
                      </Button>
                    </Form>
                  </div>
                </Tab>

                <Tab eventKey="assessment" title="Assessment">
                  <div
                    style={{
                      height: "calc(100vh - 190px)",
                      overflowY: "auto",
                      paddingRight: "4px",
                    }}
                  >
                    {!selectedSection.topicId && (
                      <Alert variant="secondary" className="small">
                        Assessment is available for the five technical control themes.
                      </Alert>
                    )}

                    {selectedSection.topicId && loadingAssessmentQuestion && (
                      <Alert variant="info" className="small">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Loading question...
                      </Alert>
                    )}

                    {assessmentError && (
                      <Alert variant="danger" className="small">
                        {assessmentError}
                      </Alert>
                    )}

                    {selectedSection.topicId &&
                      !assessmentQuestion &&
                      !loadingAssessmentQuestion && (
                        <Button
                          size="sm"
                          onClick={() => loadAssessmentQuestion(selectedSection)}
                        >
                          Load assessment question
                        </Button>
                      )}

                    {assessmentQuestion && (
                      <>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <Badge bg="primary">{selectedSection.shortTitle}</Badge>
                          {assessmentQuestion.difficulty && (
                            <Badge bg="secondary">
                              {assessmentQuestion.difficulty}
                            </Badge>
                          )}
                        </div>

                        {assessmentQuestion.scenario_context && (
                          <Alert variant="light" className="small">
                            <strong>Scenario:</strong>{" "}
                            {assessmentQuestion.scenario_context}
                          </Alert>
                        )}

                        <p className="small">
                          <strong>Question:</strong>{" "}
                          {assessmentQuestion.question_text}
                        </p>

                        <Form.Group className="mb-3">
                          <Form.Label className="small">Your answer</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={6}
                            value={assessmentAnswer}
                            onChange={(event) =>
                              setAssessmentAnswer(event.target.value)
                            }
                            placeholder="Write your answer here..."
                          />
                        </Form.Group>

                        <Button
                          size="sm"
                          onClick={submitAssessment}
                          disabled={submittingAssessment || !assessmentAnswer.trim()}
                        >
                          {submittingAssessment ? "Submitting..." : "Submit answer"}
                        </Button>

                        {assessmentResult && (
                          <div className="mt-4">
                            <hr />

                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h6 className="mb-0">
                                Score: {assessmentResult.score}/
                                {assessmentResult.max_score}
                              </h6>
                              <Badge
                                bg={
                                  assessmentResult.score /
                                    assessmentResult.max_score >=
                                  0.8
                                    ? "success"
                                    : assessmentResult.score /
                                        assessmentResult.max_score >=
                                      0.5
                                    ? "primary"
                                    : "warning"
                                }
                              >
                                Formative
                              </Badge>
                            </div>

                            <Alert variant="success" className="small">
                              <strong>Strengths</strong>
                              <ul className="mb-0 mt-2">
                                {assessmentResult.strengths.map((item, index) => (
                                  <li key={`strength-${index}`}>{item}</li>
                                ))}
                              </ul>
                            </Alert>

                            <Alert variant="warning" className="small">
                              <strong>Missing points</strong>
                              <ul className="mb-0 mt-2">
                                {assessmentResult.missing_points.map(
                                  (item, index) => (
                                    <li key={`missing-${index}`}>{item}</li>
                                  )
                                )}
                              </ul>
                            </Alert>

                            <Alert variant="info" className="small">
                              <strong>Feedback</strong>
                              <p className="mb-0 mt-2">
                                {assessmentResult.feedback}
                              </p>
                            </Alert>

                            {assessmentResult.sources.length > 0 && (
                              <details>
                                <summary className="small fw-semibold">
                                  Sources used
                                </summary>

                                <ListGroup className="mt-2">
                                  {assessmentResult.sources
                                    .slice(0, 3)
                                    .map((source) => (
                                      <ListGroup.Item key={source.id}>
                                        <div className="small">
                                          <strong>
                                            {source.section_title ??
                                              "Unknown section"}
                                          </strong>
                                          {source.page_number && (
                                            <span>
                                              {" "}
                                              — source page {source.page_number}
                                            </span>
                                          )}
                                        </div>

                                        {source.similarity !== null && (
                                          <small className="text-muted">
                                            Similarity:{" "}
                                            {source.similarity.toFixed(3)}
                                          </small>
                                        )}

                                        <p className="mb-0 mt-2">
                                          <small>
                                            {source.content_preview.slice(0, 150)}
                                            ...
                                          </small>
                                        </p>
                                      </ListGroup.Item>
                                    ))}
                                </ListGroup>
                              </details>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </aside>
      </main>
    </div>
  );
}

export default App;