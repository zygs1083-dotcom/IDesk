export function AgentPhoto() {
  return (
    <div className="agent-photo" aria-hidden="true">
      <div className="agent-photo__scene">
        <span className="agent-photo__agent agent-photo__agent--claude">
          <span className="agent-photo__walk" />
          <span className="agent-photo__pose" />
        </span>
        <span className="agent-photo__agent agent-photo__agent--codex">
          <span className="agent-photo__walk" />
          <span className="agent-photo__pose" />
        </span>
        <span className="agent-photo__agent agent-photo__agent--gemini">
          <span className="agent-photo__walk" />
          <span className="agent-photo__pose" />
        </span>
      </div>
    </div>
  );
}
