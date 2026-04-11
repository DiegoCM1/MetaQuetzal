# DB Connection, embedding model loading, query embeddings, result formatting
from app.core.config import settings
from sentence_transformers import SentenceTransformer
import psycopg2

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
SIMILARITY_THRESHOLD = 0.5
TOP_K = 5




model = SentenceTransformer(MODEL_NAME) #Loaded once at startup

DATABASE_URL = settings.DATABASE_URL


# psycopg2 Connection
def retrieve(query: str) -> list[str]:
    #   1. Embed the query → float[384]   
    embedded_query = model.encode(query, normalize_embeddings=True)
    print("[chat] Embedded query")

    #   2. Connect to pgvector, run similarity search, get top-k rows
    # Connection
    db_url = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")
    print("[chat] Connecting to pgvector...")
    try:
        connection = psycopg2.connect(db_url)
        print("[chat] Connected to pgvector")
    except Exception as e:
        raise ConnectionError(f"[chat] Failed to connect to db: {e}")

    cursor = connection.cursor()

    # Run similarity search and get top-k results
    cursor.execute(
        f"SELECT text FROM rag_chunks WHERE embedding <=> %s::vector < %s ORDER BY embedding <=> %s::vector LIMIT {TOP_K}",
        (embedded_query.tolist(), SIMILARITY_THRESHOLD, embedded_query.tolist())
        )
    rows = cursor.fetchall() # Pulls requests out of cursor into python

    cursor.close() # Closing cursor connection
    connection.close()

    #   3. Return the text fields as a list of strings 
    retrieved_top_k = [row[0] for row in rows] # Converts tuples into a list of strings 
    return retrieved_top_k

    


