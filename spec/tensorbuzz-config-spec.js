import {constants} from "node:fs"
import {access, readFile} from "node:fs/promises"
import path from "node:path"
import {fileURLToPath} from "node:url"
import {load} from "js-yaml"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const catchAll = "**/*"

const exists = async relativePath => {
  try {
    await access(path.join(repoRoot, relativePath), constants.F_OK)

    return true
  } catch {
    return false
  }
}

const loadConfig = async () => {
  const text = await readFile(path.join(repoRoot, "tensorbuzz.yml"), "utf8")

  return load(text)
}

describe("tensorbuzz.yml", () => {
  it("is the only build config the repo carries", async () => {
    expect(await exists("tensorbuzz.yml")).toBe(true)
    expect(await exists("peak_flow.yml")).toBe(false)
  })

  it("keeps running the same commands it ran before paths were declared", async () => {
    const config = await loadConfig()

    expect(config.before_script).toEqual(["npm install"])
    expect(config.script).toEqual(["npm test"])
  })

  it("declares a non-empty paths list of glob strings", async () => {
    const config = await loadConfig()

    expect(Array.isArray(config.paths)).toBe(true)
    expect(config.paths.length).toBeGreaterThan(0)

    for (const pattern of config.paths) {
      expect(typeof pattern).toBe("string")
      expect(pattern.trim().length).toBeGreaterThan(0)
    }
  })

  it("opens with the fail-open catch-all", async () => {
    const config = await loadConfig()

    expect(config.paths[0]).toBe(catchAll)
  })

  it("orders every negation after the catch-all so last match wins", async () => {
    const config = await loadConfig()
    const catchAllIndex = config.paths.indexOf(catchAll)

    for (const [index, pattern] of config.paths.entries()) {
      if (!pattern.startsWith("!")) continue

      expect(index).toBeGreaterThan(catchAllIndex)
    }
  })

  it("quotes every negation, because js-yaml reads a bare `!` as a scalar tag", async () => {
    const text = await readFile(path.join(repoRoot, "tensorbuzz.yml"), "utf8")
    const unquotedNegations = text.split("\n").filter(line => /^\s*-\s+!/.test(line))

    expect(unquotedNegations).toEqual([])
  })

  it("never negates a path the build reads", async () => {
    const config = await loadConfig()
    const negations = config.paths.filter(pattern => pattern.startsWith("!"))
    const readPaths = ["package.json", "package-lock.json", "src/mutex.js", "src/readers-writer-lock.js", "spec/mutex-spec.js", "tsconfig.json"]

    for (const readPath of readPaths) {
      const negated = negations.some(pattern => pattern.slice(1) === readPath)

      expect(negated).toBe(false)
    }
  })
})
