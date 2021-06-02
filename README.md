# epic-locks

A project meant to contain multiple different type of mutex locks.

## Usage

### ReadersWriterLock

```js
const {ReadersWriterLock} = require("epic-locks")

const lock = new ReadersWriterLock()
const promises = []
const result = []

promises.push(
  lock.read(async () => {
    await awaitTimeout(50)
    result.push(3)
  })
)
promises.push(
  lock.write(async () => {
    await awaitTimeout(10)

    lock.read(async () => {
      result.push(5)
    })

    result.push(4)
  })
)
promises.push(
  lock.read(async () => {
    await awaitTimeout(40)
    result.push(2)
  })
)
promises.push(
  lock.write(async () => {
    await awaitTimeout(20)
    result.push(6)
  })
)
promises.push(
  lock.read(async () => {
    await awaitTimeout(30)
    result.push(1)
  })
)

await Promise.all(promises)

expect(result).toEqual([1, 2, 3, 4, 5, 6])
```
