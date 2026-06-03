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
  question_order?: number | null;
  official_ref?: string | null;
  source_title?: string | null;
  question_position?: number;
  total_questions?: number;
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
  total_questions: number;
  attempted_questions: number;
  mastery_percentage: number;
  xp: number;
};

type BadgeCounts = {
  mastered: number;
  gold: number;
  silver: number;
  bronze: number;
  started: number;
  not_started: number;
};

type ProgressResponse = {
  session_id: string;
  overall_mastery: number;
  total_xp: number;
  badges: BadgeCounts;
  progress: ProgressItem[];
};

const DEFAULT_BADGE_COUNTS: BadgeCounts = {
  mastered: 0,
  gold: 0,
  silver: 0,
  bronze: 0,
  started: 0,
  not_started: 0,
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
  if (badge === "mastered") return "Mastered";
  if (badge === "gold") return "Gold";
  if (badge === "silver") return "Silver";
  if (badge === "bronze") return "Bronze";
  if (badge === "started") return "Started";
  return "Not Started";
}

function getBadgeVariant(badge: string | null): string {
  if (badge === "mastered") return "success";
  if (badge === "gold") return "warning";
  if (badge === "silver") return "info";
  if (badge === "bronze") return "primary";
  if (badge === "started") return "secondary";
  return "light";
}

function shouldUseDarkBadgeText(badge: string | null): boolean {
  return badge === "gold" || badge === "silver" || badge === "not_started";
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
  const [overallMastery, setOverallMastery] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [badgeCounts, setBadgeCounts] =
    useState<BadgeCounts>(DEFAULT_BADGE_COUNTS);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [progressError, setProgressError] = useState("");

  const pdfUrl = `${PDF_PATH}#page=${selectedSection.page}&zoom=60`;

  const totalQuestions = progressItems.reduce(
    (total, item) => total + item.total_questions,
    0
  );

  const attemptedQuestions = progressItems.reduce(
    (total, item) => total + item.attempted_questions,
    0
  );

  const totalKnowledgeScore = progressItems.reduce(
    (total, item) => total + (item.latest_score ?? 0),
    0
  );

  const totalPossibleKnowledgeScore = progressItems.reduce(
    (total, item) => total + (item.max_score ?? 0),
    0
  );

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

      setProgressItems(data.progress ?? []);
      setOverallMastery(data.overall_mastery ?? 0);
      setTotalXp(data.total_xp ?? 0);
      setBadgeCounts({
        ...DEFAULT_BADGE_COUNTS,
        ...(data.badges ?? {}),
      });
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
    questionId: string,
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
          question_id: questionId,
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

  const loadAssessmentQuestion = async (
    section: LearningSection,
    currentQuestionId?: string,
    direction?: "next" | "previous"
  ) => {
    setAssessmentQuestion(null);
    setAssessmentAnswer("");
    setAssessmentResult(null);
    setAssessmentError("");

    if (!section.topicId) return;

    setLoadingAssessmentQuestion(true);

    try {
      const activeSessionId = sessionId || getOrCreateSessionId();

      if (!sessionId) {
        setSessionId(activeSessionId);
      }

      const queryParams = new URLSearchParams();

      queryParams.set("session_id", activeSessionId);

      if (currentQuestionId && direction === "next") {
        queryParams.set("exclude_question_id", currentQuestionId);
      }

      if (currentQuestionId && direction === "previous") {
        queryParams.set("previous_question_id", currentQuestionId);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/assessment/question/${
          section.topicId
        }?${queryParams.toString()}`
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
        err instanceof Error
          ? err.message
          : "Failed to load assessment question"
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
      setChatError(
        err instanceof Error ? err.message : "Failed to get AI answer"
      );
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
          assessmentQuestion.id,
          data.score,
          data.max_score
        );
      }
    } catch (err) {
      setAssessmentError(
        err instanceof Error
          ? err.message
          : "Failed to submit assessment answer"
      );
    } finally {
      setSubmittingAssessment(false);
    }
  };

  const loadPreviousAssessmentQuestion = async () => {
    if (!selectedSection.topicId || !assessmentQuestion) return;

    await loadAssessmentQuestion(
      selectedSection,
      assessmentQuestion.id,
      "previous"
    );
  };

  const loadNextAssessmentQuestion = async () => {
    if (!selectedSection.topicId || !assessmentQuestion) return;

    await loadAssessmentQuestion(selectedSection, assessmentQuestion.id, "next");
  };

  const retryCurrentAssessmentQuestion = () => {
    setAssessmentAnswer("");
    setAssessmentResult(null);
    setAssessmentError("");
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
            PDF learning, grounded AI tutoring, formative assessment and
            progress tracking
          </small>
        </div>

        <Badge bg="warning" text="dark" style={{ fontSize: "0.8rem" }}>
          Learning Prototype Only
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
        <aside
          style={{
            minHeight: 0,
            display: "grid",
            gridTemplateRows: "auto 1fr auto",
            gap: "10px",
          }}
        >
          <Card className="border-0 shadow-sm">
            <Card.Body style={{ padding: "12px" }}>
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Progress</h6>
                <Badge bg="dark">{totalXp} XP</Badge>
              </div>

              <div className="mt-2">
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">Overall Mastery</small>
                  <Badge bg="primary">{overallMastery}%</Badge>
                </div>

                <ProgressBar
                  now={overallMastery}
                  className="my-2"
                  style={{ height: "8px" }}
                />

                <small className="text-muted">
                  Knowledge Score: {totalKnowledgeScore}/
                  {totalPossibleKnowledgeScore}
                </small>

                <br />

                <small className="text-muted">
                  {attemptedQuestions}/{totalQuestions} questions attempted
                </small>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "5px",
                  marginTop: "10px",
                }}
              >
                <Badge bg="success">Mastered {badgeCounts.mastered}</Badge>
                <Badge bg="warning" text="dark">
                  Gold {badgeCounts.gold}
                </Badge>
                <Badge bg="info" text="dark">
                  Silver {badgeCounts.silver}
                </Badge>
                <Badge bg="primary">Bronze {badgeCounts.bronze}</Badge>
              </div>

              {progressError && (
                <Alert variant="warning" className="py-1 px-2 small mt-2 mb-0">
                  {progressError}
                </Alert>
              )}

              {loadingProgress && (
                <small className="text-muted d-block mt-2">
                  <Spinner animation="border" size="sm" className="me-1" />
                  Loading progress...
                </small>
              )}
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm" style={{ minHeight: 0 }}>
            <Card.Body
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                padding: "12px",
                overflow: "hidden",
              }}
            >
              <div style={{ marginBottom: "8px", textAlign: "center" }}>
                <h6 className="mb-0">Learning Sections</h6>
              </div>

              <ListGroup
                variant="flush"
                style={{
                  minHeight: 0,
                  overflowY: "auto",
                  display: "grid",
                  gap: "6px",
                }}
              >
                {LEARNING_SECTIONS.map((section) => {
                  const progress = section.topicId
                    ? getProgressForTopic(section.topicId)
                    : undefined;

                  const mastery = progress?.mastery_percentage ?? 0;
                  const knowledgeScore = progress?.latest_score ?? 0;
                  const maxKnowledgeScore = progress?.max_score ?? 0;
                  const badge = progress?.badge_awarded ?? "not_started";
                  const xp = progress?.xp ?? 0;

                  return (
                    <ListGroup.Item
                      key={section.id}
                      action
                      active={selectedSection.id === section.id}
                      onClick={() => selectSection(section)}
                      style={{
                        padding: "7px 6px",
                        borderRadius: "9px",
                        marginBottom: "0",
                        textAlign: "center",
                        fontWeight: 600,
                        fontSize: "0.84rem",
                        border: "1px solid #e1e5ea",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gap: "3px",
                          justifyItems: "center",
                        }}
                      >
                        <span>{section.shortTitle}</span>

                        {section.topicId && (
                          <>
                            <ProgressBar
                              now={mastery}
                              style={{
                                width: "100%",
                                height: "6px",
                              }}
                            />

                            <div
                              style={{
                                width: "100%",
                                display: "grid",
                                gridTemplateColumns: "1fr auto auto",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <small
                                className={
                                  selectedSection.id === section.id
                                    ? ""
                                    : "text-muted"
                                }
                                style={{
                                  fontSize: "0.68rem",
                                  textAlign: "left",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {knowledgeScore}/{maxKnowledgeScore} · {mastery}%
                              </small>

                              <Badge
                                bg={getBadgeVariant(badge)}
                                text={
                                  shouldUseDarkBadgeText(badge)
                                    ? "dark"
                                    : undefined
                                }
                                style={{
                                  fontSize: "0.62rem",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {formatBadgeLabel(badge)}
                              </Badge>

                              <small
                                className={
                                  selectedSection.id === section.id
                                    ? ""
                                    : "text-muted"
                                }
                                style={{
                                  fontSize: "0.68rem",
                                  textAlign: "right",
                                  whiteSpace: "nowrap",
                                  fontWeight: 600,
                                }}
                              >
                                {xp} XP
                              </small>
                            </div>
                          </>
                        )}
                      </div>
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            </Card.Body>
          </Card>

          {sessionId && (
            <Card className="border-0 shadow-sm">
              <Card.Body style={{ padding: "8px 10px" }}>
                <small className="text-muted">
                  Session: {sessionId.slice(0, 16)}...
                </small>
              </Card.Body>
            </Card>
          )}
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
                        Ask questions grounded in retrieved Cyber Essentials
                        content.
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
                            What should an organisation do when an employee
                            leaves?
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
                              bg={
                                message.role === "user" ? "primary" : "success"
                              }
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
                          </Card.Body>
                        </Card>
                      ))}

                      {loadingAnswer && (
                        <Alert variant="info" className="mb-0 small">
                          <Spinner
                            animation="border"
                            size="sm"
                            className="me-2"
                          />
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
                        Assessment is available for the five technical control
                        themes.
                      </Alert>
                    )}

                    {selectedSection.topicId && loadingAssessmentQuestion && (
                      <Alert variant="info" className="small">
                        <Spinner
                          animation="border"
                          size="sm"
                          className="me-2"
                        />
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
                          Load Assessment Question
                        </Button>
                      )}

                    {assessmentQuestion && (
                      <>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                            gap: "6px",
                            marginBottom: "12px",
                          }}
                        >
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={retryCurrentAssessmentQuestion}
                            disabled={
                              !assessmentResult ||
                              loadingAssessmentQuestion ||
                              submittingAssessment
                            }
                            style={{
                              fontSize: "0.72rem",
                              padding: "5px 4px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Retry Question
                          </Button>

                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={loadPreviousAssessmentQuestion}
                            disabled={
                              loadingAssessmentQuestion ||
                              submittingAssessment ||
                              !assessmentQuestion
                            }
                            style={{
                              fontSize: "0.72rem",
                              padding: "5px 4px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Previous Question
                          </Button>

                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={loadNextAssessmentQuestion}
                            disabled={
                              !assessmentResult ||
                              loadingAssessmentQuestion ||
                              submittingAssessment
                            }
                            style={{
                              fontSize: "0.72rem",
                              padding: "5px 4px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {loadingAssessmentQuestion
                              ? "Loading..."
                              : "Next Question"}
                          </Button>
                        </div>

                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <Badge bg="secondary">
                            Question {assessmentQuestion.question_position ?? 1}{" "}
                            of {assessmentQuestion.total_questions ?? 1}
                          </Badge>
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
                          disabled={
                            submittingAssessment || !assessmentAnswer.trim()
                          }
                        >
                          {submittingAssessment
                            ? "Submitting..."
                            : "Submit Answer"}
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
                                {assessmentResult.strengths.map(
                                  (item, index) => (
                                    <li key={`strength-${index}`}>{item}</li>
                                  )
                                )}
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
                                            {source.content_preview.slice(
                                              0,
                                              150
                                            )}
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