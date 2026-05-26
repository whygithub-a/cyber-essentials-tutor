import { useEffect, useState } from "react";
import { Alert, Button, Card, Container, Spinner } from "react-bootstrap";

type HealthResponse = {
  status: string;
};

function App() {
  const [status, setStatus] = useState<string>("checking");
  const [error, setError] = useState<string>("");

  const checkBackend = async () => {
    setStatus("checking");
    setError("");

    try {
      const response = await fetch("http://localhost:8000/api/health");

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data: HealthResponse = await response.json();
      setStatus(data.status);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  useEffect(() => {
    checkBackend();
  }, []);

  return (
    <Container className="py-5">
      <Card>
        <Card.Body>
          <Card.Title>Cyber Essentials Intelligent Tutoring System</Card.Title>

          <Card.Text>
            This is the first frontend-backend connection test.
          </Card.Text>

          {status === "checking" && (
            <Alert variant="info">
              <Spinner animation="border" size="sm" className="me-2" />
              Checking backend connection...
            </Alert>
          )}

          {status === "ok" && (
            <Alert variant="success">
              Backend connected successfully.
            </Alert>
          )}

          {status === "error" && (
            <Alert variant="danger">
              Backend connection failed: {error}
            </Alert>
          )}

          <Button onClick={checkBackend}>Check backend again</Button>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default App;