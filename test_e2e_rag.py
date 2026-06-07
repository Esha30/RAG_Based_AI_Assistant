import time
import json
import os
import sys
import httpx

BASE_URL = "http://127.0.0.1:8000"
EMAIL = "demo@ragassistant.ai"
PASSWORD = "Demo1234!"
TEMP_FILE = "test_rag_input.txt"

def print_cyan(text):
    print(f"\033[96m{text}\033[0m")

def print_green(text):
    print(f"\033[92m{text}\033[0m")

def print_yellow(text):
    print(f"\033[93m{text}\033[0m")

def print_red(text):
    print(f"\033[91m{text}\033[0m")

def main():
    print_cyan("\n=============================================")
    print_cyan("   RAG AI Assistant - End-to-End RAG Test   ")
    print_cyan("=============================================\n")

    client = httpx.Client(timeout=30.0)

    # 1. Login
    print_yellow("[1] Authenticating...")
    login_url = f"{BASE_URL}/api/auth/login"
    try:
        r = client.post(login_url, json={"email": EMAIL, "password": PASSWORD})
        if r.status_code != 200:
            # Try registering first if login fails
            print_yellow("    Login failed, attempting registration...")
            reg_url = f"{BASE_URL}/api/auth/register"
            reg_r = client.post(reg_url, json={"email": EMAIL, "username": "demouser", "password": PASSWORD})
            if reg_r.status_code not in (200, 201):
                print_red(f"    Registration failed: {reg_r.text}")
                sys.exit(1)
            # Retry login
            r = client.post(login_url, json={"email": EMAIL, "password": PASSWORD})
        
        r.raise_for_status()
        token = r.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"
        print_green("    Authentication SUCCESSFUL!")
    except Exception as e:
        print_red(f"    Auth FAILED: {e}")
        sys.exit(1)

    # 2. Create Temp File
    print_yellow("\n[2] Creating temporary document...")
    secret_text = "The secret operations code is 'ORION-NEBULA-X9'. The storage location is the Dark Side of the Moon inside Sector 4."
    with open(TEMP_FILE, "w", encoding="utf-8") as f:
        f.write(secret_text)
    print_green(f"    Created local file: {TEMP_FILE}")

    # 3. Upload File
    print_yellow("\n[3] Uploading document for ingestion...")
    upload_url = f"{BASE_URL}/api/documents/upload"
    doc_id = None
    try:
        with open(TEMP_FILE, "rb") as f:
            files = {"file": (TEMP_FILE, f, "text/plain")}
            r = client.post(upload_url, files=files)
        r.raise_for_status()
        res = r.json()
        doc_id = res["document"]["id"]
        print_green(f"    Upload SUCCESSFUL! Document ID: {doc_id}")
    except Exception as e:
        print_red(f"    Upload FAILED: {e}")
        cleanup(TEMP_FILE)
        sys.exit(1)

    # 4. Poll Document Processing Status
    print_yellow("\n[4] Waiting for background vector ingestion...")
    max_polls = 15
    ingested = False
    for i in range(max_polls):
        time.sleep(2)
        try:
            r = client.get(f"{BASE_URL}/api/documents/")
            r.raise_for_status()
            docs = r.json()["documents"]
            target_doc = next((d for d in docs if d["id"] == doc_id), None)
            if target_doc:
                chunks = target_doc.get("chunk_count", 0)
                print(f"    Poll {i+1}: chunk_count = {chunks}")
                if chunks > 0:
                    ingested = True
                    print_green(f"    Document successfully indexed with {chunks} chunks!")
                    break
            else:
                print_red("    Document not found in list!")
                break
        except Exception as e:
            print_yellow(f"    Poll error: {e}")
            
    if not ingested:
        print_red("    Background ingestion TIMEOUT or FAILED.")
        cleanup(TEMP_FILE, client, doc_id)
        sys.exit(1)

    # 5. Create Chat Session
    print_yellow("\n[5] Creating chat session...")
    chat_id = None
    try:
        r = client.post(f"{BASE_URL}/api/chats/", json={"title": "E2E Test Chat", "document_ids": [doc_id]})
        r.raise_for_status()
        chat_id = r.json()["id"]
        print_green(f"    Chat session created! Chat ID: {chat_id}")
    except Exception as e:
        print_red(f"    Chat creation FAILED: {e}")
        cleanup(TEMP_FILE, client, doc_id)
        sys.exit(1)

    # 6. Send Question & Stream Response
    print_yellow("\n[6] Sending question and parsing RAG stream...")
    msg_url = f"{BASE_URL}/api/chats/{chat_id}/messages"
    payload = {
        "content": "What is the storage location of ORION-NEBULA-X9?",
        "document_ids": [doc_id]
    }
    
    full_answer = ""
    sources_cited = []
    
    try:
        # Use streaming request
        with client.stream("POST", msg_url, json=payload) as response:
            if response.status_code != 200:
                print_red(f"    Stream request failed: HTTP {response.status_code}")
                cleanup(TEMP_FILE, client, doc_id, chat_id)
                sys.exit(1)
            
            buffer = ""
            for chunk in response.iter_text():
                buffer += chunk
                while "\n\n" in buffer:
                    part, buffer = buffer.split("\n\n", 1)
                    line = part.strip()
                    if line.startswith("data: "):
                        data_str = line[6:]
                        try:
                            data = json.loads(data_str)
                            if data["type"] == "chunk":
                                print(data["content"], end="", flush=True)
                                full_answer += data["content"]
                            elif data["type"] == "sources":
                                sources_cited = data["sources"]
                            elif data["type"] == "done":
                                print("\n")
                        except Exception as e:
                            pass
                            
        print_green(f"    Answer Stream complete.")
        print_green(f"    Sources cited: {len(sources_cited)}")
        for idx, src in enumerate(sources_cited):
            print(f"      - Source {idx+1}: {src['source']} (Page {src['page']})")
    except Exception as e:
        print_red(f"\n    Streaming failed: {e}")
        cleanup(TEMP_FILE, client, doc_id, chat_id)
        sys.exit(1)

    # 7. Verification
    print_yellow("\n[7] Verifying RAG engine correctness...")
    keyword_match = "moon" in full_answer.lower() or "sector 4" in full_answer.lower()
    if keyword_match:
        print_green("    Verification SUCCESS! The AI correctly answered from the uploaded text context.")
    else:
        print_red("    Verification FAILED! The AI answer did not contain the expected keywords.")
        print_red(f"    Actual Answer was: {full_answer}")

    # 8. Cleanup
    print_yellow("\n[8] Cleaning up workspace & databases...")
    cleanup(TEMP_FILE, client, doc_id, chat_id)
    
    print_cyan("\n=============================================")
    if keyword_match:
        print_green("      ALL E2E RAG PIPELINE TESTS PASSED!      ")
    else:
        print_red("             E2E RAG TEST FAILED!             ")
    print_cyan("=============================================\n")

    if not keyword_match:
        sys.exit(1)

def cleanup(temp_file, client=None, doc_id=None, chat_id=None):
    if os.path.exists(temp_file):
        try:
            os.remove(temp_file)
            print("    Deleted local temp file.")
        except Exception:
            pass
            
    if client:
        if chat_id:
            try:
                r = client.delete(f"{BASE_URL}/api/chats/{chat_id}")
                if r.status_code == 200:
                    print("    Deleted database chat session.")
            except Exception:
                pass
        if doc_id:
            try:
                r = client.delete(f"{BASE_URL}/api/documents/{doc_id}")
                if r.status_code == 200:
                    print("    Deleted database document & collection.")
            except Exception:
                pass
        client.close()

if __name__ == "__main__":
    main()
