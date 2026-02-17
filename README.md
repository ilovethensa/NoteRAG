# NoteRAG

Previously, I found myself constantly copying useful snippets from Reddit comments or articles and sending them to a Discord channel. When I needed to find something, I'd have to manually search through countless messages. I wanted to switch to a more efficient system, but all the existing RAG chat UIs were either too complex, too large, or didn't fit my simple needs. This project was born out of the desire for a straightforward solution: a place where I can just paste snippets and then easily query them with an LLM.

## Getting Started

### Prerequisites

-   **Docker**: Make sure Docker Desktop (or Docker Engine) is installed and running on your machine. You can get it from [here](https://docs.docker.com/get-docker/).

### Quick Start with Docker Compose

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/rag.git
    cd rag
    ```

2.  **Set your OpenAI API Key**:
    You need to set your `OPENAI_API_KEY` in your `.env`. copy `.env.example` to `.env`.
    ```bash
    OPENAI_BASE_URL=
    OPENAI_API_KEY=
    OPENAI_MODEL=
    OPENAI_EMBEDDING_API_KEY=
    OPENAI_EMBEDDING_BASE_URL=
    OPENAI_EMBEDDING_MODEL=
    PGVECTOR_EMBEDDING_DIMENSIONS=1024
    ```
3.  **Launch the application**:
    From the project root directory, run the following command:
    ```bash
    docker-compose up
    ```

4.  **Access your AI knowledge base**:
    Once everything is up and running, open your web browser and go to [http://localhost:3000](http://localhost:3000).

That's it! You're all set to start managing your snippets and chatting with your personal AI.
