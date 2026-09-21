export default function BufferWireframePage() {
  return (
    <div className="admin-buffer-frame">
      <iframe title="Buffer" src="https://publish.buffer.com" />
      <a
        className="admin-retry"
        href="https://publish.buffer.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Buffer
      </a>
    </div>
  );
}
