const Docker = require("dockerode");
const { PassThrough } = require("stream");

class DockerClient {
  constructor(socketPath = "/var/run/docker.sock") {
    this.docker = new Docker({ socketPath });
    this.available = false;
  }

  async init() {
    try {
      await this.docker.ping();
      this.available = true;
    } catch {
      this.available = false;
    }
    return this.available;
  }

  async imageExists(name) {
    try {
      await this.docker.getImage(name).inspect();
      return true;
    } catch { return false; }
  }

  async createContainer(opts) {
    return this.docker.createContainer(opts);
  }

  async startContainer(containerId) {
    const container = this.docker.getContainer(containerId);
    await container.start();
  }

  async stopContainer(containerId, timeout = 10) {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: timeout });
    } catch (err) {
      // Expected when container already stopped or doesn't exist
      console.log(`[docker] stopContainer ${containerId}: ${err.reason || err.message}`);
    }
  }

  async removeContainer(containerId) {
    try {
      const container = this.docker.getContainer(containerId);
      await container.remove({ force: true });
    } catch (err) {
      // Expected when container doesn't exist
      console.log(`[docker] removeContainer ${containerId}: ${err.reason || err.message}`);
    }
  }

  async execInContainer(containerId, cmd, args = [], { label, quiet, env, timeoutMs } = {}) {
    const container = this.docker.getContainer(containerId);
    const tag = label || cmd;

    const dockerExec = await container.exec({
      Cmd: [cmd, ...args],
      AttachStdout: true,
      AttachStderr: true,
      Env: env || [],
    });

    const stream = await dockerExec.start({ hijack: true, stdin: false });

    return new Promise((resolve, reject) => {
      let stdout = "";
      let stderr = "";
      let settled = false;
      let timer = null;

      const stdoutStream = new PassThrough();
      const stderrStream = new PassThrough();

      this.docker.modem.demuxStream(stream, stdoutStream, stderrStream);

      function settle(value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }

      if (timeoutMs) {
        timer = setTimeout(() => {
          settle({
            exitCode: 124,
            stdout,
            stderr: stderr + `\n[timeout] exec '${cmd}' exceeded ${timeoutMs}ms`,
          });
        }, timeoutMs);
      }

      stdoutStream.on("data", (d) => {
        const chunk = d.toString();
        stdout += chunk;
        if (!quiet) {
          for (const line of chunk.split("\n")) {
            if (line.trim()) process.stdout.write(`  [${tag}] ${line}\n`);
          }
        }
      });

      stderrStream.on("data", (d) => {
        const chunk = d.toString();
        stderr += chunk;
        if (!quiet) {
          for (const line of chunk.split("\n")) {
            if (line.trim()) process.stderr.write(`  [${tag}] ${line}\n`);
          }
        }
      });

      stream.on("end", async () => {
        try {
          const inspect = await dockerExec.inspect();
          settle({ exitCode: inspect.ExitCode, stdout, stderr });
        } catch (err) {
          settle({ exitCode: 1, stdout, stderr: stderr + err.message });
        }
      });

      stream.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  async getContainerStatus(containerIdOrName) {
    try {
      const container = this.docker.getContainer(containerIdOrName);
      const info = await container.inspect();
      return info.State.Running ? "running" : info.State.Status;
    } catch { return "not_found"; }
  }

  async createVolume(name) {
    return this.docker.createVolume({ Name: name });
  }

  async removeVolume(name) {
    try {
      const volume = this.docker.getVolume(name);
      await volume.remove();
    } catch (err) {
      // Expected when volume doesn't exist or is in use
      console.log(`[docker] removeVolume ${name}: ${err.reason || err.message}`);
    }
  }

  async getContainerLogs(containerId, follow = false) {
    const container = this.docker.getContainer(containerId);
    return container.logs({
      stdout: true, stderr: true, follow, timestamps: true,
    });
  }

  async listContainers(filters = {}) {
    return this.docker.listContainers({ all: true, filters });
  }

  /**
   * Build a Docker image using dockerode's buildImage API.
   * Creates a tar stream of the build context via `tar` CLI (available in
   * the container), then passes it to the Docker daemon over the socket.
   *
   * @param {string} dockerfilePath - Path to the Dockerfile, relative to contextPath
   * @param {string} contextPath - Absolute path to the build context directory
   * @param {string} tag - Image tag (e.g. "dev-crew-worker:latest")
   * @returns {Promise<void>} Resolves when build succeeds, throws on failure
   */
  async buildImage(dockerfilePath, contextPath, tag) {
    const { spawn } = require("child_process");

    console.log(`[docker] Building image ${tag} from ${contextPath} (Dockerfile: ${dockerfilePath})`);

    // Create tar stream of build context using tar CLI
    const tar = spawn("tar", ["-cf", "-", "-C", contextPath, "."], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Pass tar stream to dockerode buildImage
    const stream = await this.docker.buildImage(tar.stdout, {
      t: tag,
      dockerfile: dockerfilePath,
    });

    // Follow build output and wait for completion
    await new Promise((resolve, reject) => {
      let lastError = null;
      stream.on("data", (chunk) => {
        try {
          const lines = chunk.toString().split("\n").filter(Boolean);
          for (const line of lines) {
            const json = JSON.parse(line);
            if (json.stream && json.stream.trim()) {
              console.log(`  [docker build] ${json.stream.trimEnd()}`);
            }
            if (json.error) {
              lastError = json.error;
              console.error(`  [docker build] ERROR: ${json.error}`);
            }
          }
        } catch {
          // Non-JSON output, log as-is
          const text = chunk.toString().trim();
          if (text) console.log(`  [docker build] ${text}`);
        }
      });
      stream.on("end", () => {
        if (lastError) {
          reject(new Error(`docker build failed for ${tag}: ${lastError}`));
        } else {
          console.log(`[docker] Image ${tag} built successfully`);
          resolve();
        }
      });
      stream.on("error", (err) => reject(new Error(`docker build stream error: ${err.message}`)));
    });
  }
}

module.exports = { DockerClient };
