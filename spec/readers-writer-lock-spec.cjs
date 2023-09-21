const awaitTimeout = require("./await-timeout.cjs")
const ReadersWriterLock = require("../src/readers-writer-lock.cjs")

describe("ReadersWriterLock", () => {
  it("waits for reads before letting someone write", async () => {
    const lock = new ReadersWriterLock()
    const promises = []
    const result = []

    promises.push(
      lock.read(async () => {
        await awaitTimeout(50)
        result.push(3)

        return 3
      })
    )
    promises.push(
      lock.write(async () => {
        await awaitTimeout(10)

        lock.read().then(async () => {
          result.push(5)
        })

        result.push(4)

        return 4
      })
    )
    promises.push(
      lock.read(async () => {
        await awaitTimeout(40)
        result.push(2)

        return 2
      })
    )
    promises.push(
      lock.write(async () => {
        await awaitTimeout(20)
        result.push(6)

        return 6
      })
    )
    promises.push(
      lock.read(async () => {
        await awaitTimeout(30)
        result.push(1)

        return 1
      })
    )

    const promisesResult = await Promise.all(promises)

    expect(result).toEqual([1, 2, 3, 4, 5, 6])
    expect(promisesResult).toEqual([3, 4, 2, 6, 1])
  })
})
