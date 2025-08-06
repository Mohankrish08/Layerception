import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# def upload_file(bucket_name, file, file_path):
    
#     with open(file, 'rb') as f:
#         response = (client.storage.from_(bucket_name).upload(file=f.read(), path=file_path,
#                                                             file_options={"content-type": "image/jpeg", "cache-control": "3600", "upsert": "false"}))
#         if response:
#             return True
#         else:
#             return False

def upload_file(bucket_name, file_bytes, file_path):
    response = client.storage.from_(bucket_name).upload(
        path=file_path,
        file=file_bytes,
        file_options={
            "content-type": "image/png",
            "cache-control": "3600",
            "upsert": "false"
        }
    )
    return bool(response)
        
def download_file(bucket_name, file_path, local_path):
    response = client.storage.from_(bucket_name).download(path=file_path)
    if response:
        with open(local_path, 'wb') as f:
            f.write(response)
        return True
    else:
        return False