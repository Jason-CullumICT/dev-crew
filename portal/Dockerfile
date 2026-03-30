########################################################################
# Portal — debug UI for viewing cycles, runs, and reports
# Verifies: dev-crew unified repo — Task 3 Step 3
# Builds from portal/ context, installs Backend + Frontend deps, runs both
########################################################################
FROM node:22-slim

WORKDIR /app

# Install backend deps
COPY Backend/package.json Backend/package-lock.json* ./Backend/
RUN cd Backend && npm install

# Install frontend deps
COPY Frontend/package.json Frontend/package-lock.json* ./Frontend/
RUN cd Frontend && npm install

# Copy all source
COPY . .

EXPOSE 3001 5173

CMD ["bash", "-c", "cd /app/Backend && npx tsx src/index.ts & cd /app/Frontend && npx vite --host 0.0.0.0 --port 5173 & wait"]
