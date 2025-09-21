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

  it("handles errors in the first job which runs instantly", async () => {
    const lock = new Mutex({debug: false})
    const promises = []
    const result = []

    promises.push((async () => {
      return await lock.sync(async () => {
        await awaitTimeout(25)

        throw new Error("Test error")
      })
    })())

    promises.push((async () => {
      return await lock.sync(async () => {
        await awaitTimeout(25)
        result.push(1)

        return 1
      })
    })())

    promises.push((async () => {
      return await lock.sync(async () => {
        await awaitTimeout(15)
        result.push(2)

        return 2
      })
    })())

    promises.push((async () => {
      return await lock.sync(async () => {
        await awaitTimeout(5)
        result.push(3)

        return 3
      })
    })())

    let error

    try {
      await Promise.all(promises)
    } catch (e) {
      error = e
    }

    expect(error.message).toEqual("Test error")
    expect(result).toEqual([]) // empty because Promise.all fails as soon as it encounters the error promise
  })

  it("handles errors in queued jobs", async () => {
    const lock = new Mutex({debug: false})
    const promises = []
    const result = []

    promises.push((async () => {
      return await lock.sync(async () => {
        await awaitTimeout(25)
        result.push(1)

        return 1
      })
    })())

    promises.push((async () => {
      return await lock.sync(async () => {
        await awaitTimeout(15)
        result.push(2)

        return 2
      })
    })())

    promises.push((async () => {
      return await lock.sync(async () => {
        await awaitTimeout(25)

        throw new Error("Test error")
      })
    })())

    promises.push((async () => {
      return await lock.sync(async () => {
        await awaitTimeout(5)
        result.push(3)

        return 3
      })
    })())

    let error

    try {
      await Promise.all(promises)
    } catch (e) {
      error = e
    }

    expect(error.message).toEqual("Test error")
    expect(result).toEqual([1, 2]) // 3 is missing because Promise.all fails as soon as it encounters the error promise
  })
})
