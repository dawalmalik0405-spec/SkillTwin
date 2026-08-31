import subprocess
import sys
import time

# 1. Define the commands
# Note: For 'python -m', you use the module name 'backend.main', not the filename
backend_command = [sys.executable, "-m", "backend.main"]
frontend_command = ["npm", "run", "dev"]

print("🚀 Starting both backend and frontend servers...")

try:
    # 2. Launch the backend process in the background
    backend_process = subprocess.Popen(
        backend_command, 
        shell=True if sys.platform == "win32" else False
    )

    # 3. Launch the frontend process in the background
    frontend_process = subprocess.Popen(
        frontend_command,
        cwd="frontend",  # Change working directory to 'frontend'
        shell=True if sys.platform == "win32" else False
    )

    print("🟢 Both servers are running! Press Ctrl+C to stop them.")

    # 4. Keep the script alive so the servers keep running
    while True:
        time.sleep(1)

except KeyboardInterrupt:
    print("\n🛑 Stopping both servers...")
    
    # 5. Clean up and terminate both processes safely on Ctrl+C
    backend_process.terminate()
    frontend_process.terminate()
    
    # Wait for them to completely close
    backend_process.wait()
    frontend_process.wait()
    print("✅ Servers stopped successfully.")
