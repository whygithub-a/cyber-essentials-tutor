import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  ListGroup,
  Row,
  Spinner,
} from "react-bootstrap";

const API_BASE_URL = "http://localhost:8000";

const PDF_PATH =
  "/documents/cyber-essentials-requirements-for-it-infrastructure-v3-3.pdf";

type LearningSection = {
  id: string;
  title: string;
  description: string;
  page: number;
  topicId: string | null;
};

const LEARNING_SECTIONS: LearningSection[] = [
  {
    id: "definitions",
    title: "Definitions",
    description: "Key terminology used in the Cyber Essentials requirements.",
    page: 5,
    topicId: null,
  },
  {
    id: "scope",
    title: "Scope",
    description: "Cyber Essentials scope, asset inclusion and boundaries.",
    page: 7,
    topicId: null,
  },
  {
    id: "firewalls",
    title: "Firewalls",
    description: "Firewall requirements and network access controls.",
    page: 14,
    topicId: "firewalls",
  },
  {
    id: "secure_configuration",
    title: "Secure Configuration",
    description: "Secure setup and configuration of devices and software.",
    page: 15,
    topicId: "secure_configuration",
  },
  {
    id: "security_update_management",
    title: "Security Update Management",
    description: "Supported software, updates, vulnerabilities and patches.",
    page: 16,
    topicId: "security_update_management",
  },
  {
    id: "user_access_control",
    title: "User Access Control",
    description: "User accounts, privileges and authentication.",
    page: 18,
    topicId: "user_access_control",
  },
  {
    id: "malware_protection",
    title: "Malware Protection",
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

  const pdfUrl = `${PDF_PATH}#page=${selectedSection.page}`;

  const loadAssessmentQuestion = async (section: LearningSection) => {
    setAssessmentQuestion(null);
    setAssessmentAnswer("");
    setAssessmentResult(null);
    setAssessmentError("");

    if (!section.topicId) {
      return;
    }

    setLoadingAssessmentQuestion(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/assessment/question/${section.topicId}`
      );

      if (!response.ok) {
        throw new Error(`Assessment question endpoint returned ${response.status}`);
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
    if (!question.trim()) {
      return;
    }

    const userQuestion = question.trim();

    setMessages((previousMessages) => [
      ...previousMessages,
      {
        role: "user",
        content: userQuestion,
      },
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
    if (!assessmentQuestion) {
      return;
    }

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
    } catch (err) {
      setAssessmentError(
        err instanceof Error ? err.message : "Failed to submit assessment answer"
      );
    } finally {
      setSubmittingAssessment(false);
    }
  };

  return (
    <Container fluid className="py-4 px-4">
      <Row>
        <Col md={3}>
          <Card>
            <Card.Body>
              <Card.Title>Learning Sections</Card.Title>
              <Card.Text>
                Select a section to read the official Cyber Essentials PDF.
              </Card.Text>

              <ListGroup>
                {LEARNING_SECTIONS.map((section) => (
                  <ListGroup.Item
                    key={section.id}
                    action
                    active={selectedSection.id === section.id}
                    onClick={() => selectSection(section)}
                  >
                    <strong>{section.title}</strong>
                    <br />
                    <small>{section.description}</small>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        <Col md={5}>
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <Card.Title>{selectedSection.title}</Card.Title>
                  <Card.Text>{selectedSection.description}</Card.Text>
                </div>
                <Badge bg="secondary">Reader page {selectedSection.page}</Badge>
              </div>

              <div
                style={{
                  border: "1px solid #dee2e6",
                  borderRadius: "8px",
                  overflow: "hidden",
                  height: "760px",
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
        </Col>

        <Col md={4}>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title>AI Tutor</Card.Title>
              <Card.Text>
                Ask a question about Cyber Essentials. The tutor retrieves
                relevant Cyber Essentials content before generating an answer.
              </Card.Text>

              {chatError && <Alert variant="danger">{chatError}</Alert>}

              <div
                style={{
                  minHeight: "360px",
                  maxHeight: "480px",
                  overflowY: "auto",
                  border: "1px solid #dee2e6",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "16px",
                  background: "#f8f9fa",
                }}
              >
                {messages.length === 0 && (
                  <Alert variant="secondary">
                    Try asking:{" "}
                    <strong>
                      What should an organisation do when an employee leaves?
                    </strong>
                  </Alert>
                )}

                {messages.map((message, index) => (
                  <Card
                    key={`${message.role}-${index}`}
                    className="mb-3"
                    border={message.role === "user" ? "primary" : "success"}
                  >
                    <Card.Body>
                      <Badge
                        bg={message.role === "user" ? "primary" : "success"}
                        className="mb-2"
                      >
                        {message.role === "user" ? "You" : "AI Tutor"}
                      </Badge>

                      <Card.Text style={{ whiteSpace: "pre-wrap" }}>
                        {message.content}
                      </Card.Text>

                      {message.sources && message.sources.length > 0 && (
                        <div>
                          <hr />
                          <strong>Sources used:</strong>
                          <ListGroup className="mt-2">
                            {message.sources.map((source) => (
                              <ListGroup.Item key={source.id}>
                                <div>
                                  <strong>
                                    {source.section_title ?? "Unknown section"}
                                  </strong>
                                  {source.page_number && (
                                    <span> — source page {source.page_number}</span>
                                  )}
                                </div>

                                {source.similarity !== null && (
                                  <small>
                                    Similarity: {source.similarity.toFixed(3)}
                                  </small>
                                )}

                                <p className="mb-0 mt-2">
                                  <small>{source.content_preview}...</small>
                                </p>
                              </ListGroup.Item>
                            ))}
                          </ListGroup>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                ))}

                {loadingAnswer && (
                  <Alert variant="info">
                    <Spinner animation="border" size="sm" className="me-2" />
                    Retrieving Cyber Essentials context and generating an
                    answer...
                  </Alert>
                )}
              </div>

              <Form
                onSubmit={(event) => {
                  event.preventDefault();
                  askTutor();
                }}
              >
                <Form.Group className="mb-3">
                  <Form.Label>Your question</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask a question about Cyber Essentials..."
                  />
                </Form.Group>

                <Button type="submit" disabled={loadingAnswer || !question.trim()}>
                  Ask AI Tutor
                </Button>
              </Form>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <Card.Title>Assessment</Card.Title>

              {!selectedSection.topicId && (
                <Alert variant="secondary">
                  Assessment is available for the five Cyber Essentials technical
                  control themes. Select Firewalls, Secure Configuration,
                  Security Update Management, User Access Control, or Malware
                  Protection.
                </Alert>
              )}

              {selectedSection.topicId && loadingAssessmentQuestion && (
                <Alert variant="info">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Loading assessment question...
                </Alert>
              )}

              {assessmentError && (
                <Alert variant="danger">{assessmentError}</Alert>
              )}

              {selectedSection.topicId && !assessmentQuestion && !loadingAssessmentQuestion && (
                <Button onClick={() => loadAssessmentQuestion(selectedSection)}>
                  Load assessment question
                </Button>
              )}

              {assessmentQuestion && (
                <>
                  <Badge bg="primary" className="mb-2">
                    {selectedSection.title}
                  </Badge>

                  {assessmentQuestion.scenario_context && (
                    <Alert variant="light">
                      <strong>Scenario:</strong>{" "}
                      {assessmentQuestion.scenario_context}
                    </Alert>
                  )}

                  <p>
                    <strong>Question:</strong>{" "}
                    {assessmentQuestion.question_text}
                  </p>

                  <Form.Group className="mb-3">
                    <Form.Label>Your answer</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      value={assessmentAnswer}
                      onChange={(event) =>
                        setAssessmentAnswer(event.target.value)
                      }
                      placeholder="Write your answer here..."
                    />
                  </Form.Group>

                  <Button
                    onClick={submitAssessment}
                    disabled={submittingAssessment || !assessmentAnswer.trim()}
                  >
                    {submittingAssessment ? "Submitting..." : "Submit answer"}
                  </Button>
                </>
              )}

              {assessmentResult && (
                <div className="mt-4">
                  <hr />

                  <h5>
                    Score: {assessmentResult.score}/{assessmentResult.max_score}
                  </h5>

                  <Alert variant="success">
                    <strong>Strengths</strong>
                    <ul className="mb-0">
                      {assessmentResult.strengths.map((item, index) => (
                        <li key={`strength-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </Alert>

                  <Alert variant="warning">
                    <strong>Missing points</strong>
                    <ul className="mb-0">
                      {assessmentResult.missing_points.map((item, index) => (
                        <li key={`missing-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </Alert>

                  <Alert variant="info">
                    <strong>Feedback</strong>
                    <p className="mb-0 mt-2">{assessmentResult.feedback}</p>
                  </Alert>

                  {assessmentResult.sources.length > 0 && (
                    <div>
                      <strong>Sources used:</strong>
                      <ListGroup className="mt-2">
                        {assessmentResult.sources.map((source) => (
                          <ListGroup.Item key={source.id}>
                            <div>
                              <strong>
                                {source.section_title ?? "Unknown section"}
                              </strong>
                              {source.page_number && (
                                <span> — source page {source.page_number}</span>
                              )}
                            </div>

                            {source.similarity !== null && (
                              <small>
                                Similarity: {source.similarity.toFixed(3)}
                              </small>
                            )}

                            <p className="mb-0 mt-2">
                              <small>{source.content_preview}...</small>
                            </p>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    </div>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default App;