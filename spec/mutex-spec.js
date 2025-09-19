import awaitTimeout from "./await-timeout.js"
import Mutex from "../src/mutex.js"

describe("Mutex", () => {
  it("locks", async () => {
    const lock = new Mutex({debug: false})
    const promises = []
    const result = []

    promises.push((async () => {
      return await lock.sync(async () => {
        await awaitTimeout(50)
        result.push(1)

        return 1
      })
    })())
    promises.push((async () => {
      return await lock.sync(async () => {
        await awaitTimeout(10)

        result.push(2)
        result.push(3)

        return 2
      })
    })())
    promises.push((async () => {
      return await lock.sync(async () => {
        await awaitTimeout(40)
        result.push(4)

        return 3
      })
    })())
    promises.push((async () => {
      return await lock.sync(async () => {
        await awaitTimeout(20)
        result.push(5)

        return 4
      })
    })())
    promises.push((async () => {
      return await lock.sync(async () => {
        await awaitTimeout(30)
        result.push(6)

        return 5
      })
    })())

    const promisesResult = await Promise.all(promises)

    expect(result).toEqual([1, 2, 3, 4, 5, 6])
    expect(promisesResult).toEqual([1, 2, 3, 4, 5])
  })
})
