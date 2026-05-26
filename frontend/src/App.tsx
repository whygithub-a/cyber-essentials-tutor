import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  ListGroup,
  Row,
  Spinner,
} from "react-bootstrap";

type HealthResponse = {
  status: string;
};

type Topic = {
  id: string;
  title: string;
  description: string;
  display_order: number;
};

type TopicsResponse = {
  topics: Topic[];
};

function App() {
  const [backendStatus, setBackendStatus] = useState<string>("checking");
  const [topicsStatus, setTopicsStatus] = useState<string>("checking");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [error, setError] = useState<string>("");

  const checkBackend = async () => {
    setBackendStatus("checking");
    setError("");

    try {
      const response = await fetch("http://localhost:8000/api/health");

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data: HealthResponse = await response.json();
      setBackendStatus(data.status);
    } catch (err) {
      setBackendStatus("error");
      setError(err instanceof Error ? err.message : "Unknown backend error");
    }
  };

  const loadTopics = async () => {
    setTopicsStatus("checking");
    setError("");

    try {
      const response = await fetch("http://localhost:8000/api/topics");

      if (!response.ok) {
        throw new Error(`Topics endpoint returned ${response.status}`);
      }

      const data: TopicsResponse = await response.json();
      setTopics(data.topics);
      setTopicsStatus("ok");
    } catch (err) {
      setTopicsStatus("error");
      setError(err instanceof Error ? err.message : "Unknown topics error");
    }
  };

  const refreshAll = async () => {
    await checkBackend();
    await loadTopics();
  };

  useEffect(() => {
    refreshAll();
  }, []);

  return (
    <Container fluid className="py-4 px-4">
      <Row>
        <Col md={4} lg={3}>
          <Card>
            <Card.Body>
              <Card.Title>Cyber Essentials Topics</Card.Title>
              <Card.Text>
                Topics loaded from the Supabase knowledge base.
              </Card.Text>

              {topicsStatus === "checking" && (
                <Alert variant="info">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Loading topics...
                </Alert>
              )}

              {topicsStatus === "error" && (
                <Alert variant="danger">Failed to load topics.</Alert>
              )}

              {topicsStatus === "ok" && (
                <ListGroup>
                  {topics.map((topic) => (
                    <ListGroup.Item key={topic.id}>
                      <strong>{topic.display_order}. {topic.title}</strong>
                      <br />
                      <small>{topic.description}</small>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={8} lg={9}>
          <Card>
            <Card.Body>
              <Card.Title>
                Cyber Essentials Intelligent Tutoring System
              </Card.Title>

              <Card.Text>
                This page verifies the connection between the React frontend,
                FastAPI backend, Azure OpenAI service, and Supabase database.
              </Card.Text>

              {backendStatus === "checking" && (
                <Alert variant="info">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Checking backend connection...
                </Alert>
              )}

              {backendStatus === "ok" && (
                <Alert variant="success">
                  Backend connected successfully.
                </Alert>
              )}

              {backendStatus === "error" && (
                <Alert variant="danger">
                  Backend connection failed: {error}
                </Alert>
              )}

              {topicsStatus === "ok" && (
                <Alert variant="success">
                  Supabase topics loaded successfully.
                </Alert>
              )}

              {error && (
                <Alert variant="warning">
                  Latest error: {error}
                </Alert>
              )}

              <Button onClick={refreshAll}>Refresh connections</Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default App;