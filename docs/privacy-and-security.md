# Privacy and security notes

- Meeting transcripts can contain customer data, employee data, commercial strategy, and confidential decisions. Treat transcripts as sensitive by default.
- The current app does not add authentication, durable storage, retention controls, or per user authorization. Put deployments behind trusted access controls before using it with private meetings.
- The server validates transcript size and structure before analysis. Audio uploads are memory backed and limited to 50 MB by the API.
- OpenAI calls happen only from the server. The client should never receive provider credentials.
- Review AI output before sending follow up emails or treating action and risk extraction as authoritative.
- Keep `.env.local`, generated notes, logs, and local meeting exports out of version control.
