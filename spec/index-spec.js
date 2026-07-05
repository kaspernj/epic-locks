import {Mutex, ReadersWriterLock} from "../src/index.js"

describe("epic-locks index", () => {
  it("exports Mutex", () => {
    expect(typeof Mutex).toEqual("function")
    expect(new Mutex() instanceof Mutex).toEqual(true)
  })

  it("exports ReadersWriterLock", () => {
    expect(typeof ReadersWriterLock).toEqual("function")
    expect(new ReadersWriterLock() instanceof ReadersWriterLock).toEqual(true)
  })
})
