export default class Mutex {
  constructor(args = {}) {
    this._debug = args.debug
    this._readers = 0
    this._writers = 0
    this._processQueueTimeout = null
    this._syncQueue = []
    this._writeQueue = []
  }

  sync(callback) {
    if (this._debug) this._log("sync")

    return new Promise((resolve, reject) => {
      this._syncQueue.push({callback, resolve, reject})
      this._processQueueLater()
    })
  }

  _log(message) {
    console.log("ReadersWriteLock", message, JSON.stringify({readers: this._readers, writers: this._writers}))
  }

  // First execute anything waiting after having given the lock back to the original caller by executing at the end of the event-queue by timeout-hack
  _processQueueLater() {
    if (this._processQueueTimeout) {
      clearTimeout(this._processQueueTimeout)
    }

    this._processQueueTimeout = setTimeout(this._processQueue, 0)
  }

  _processQueue = async () => {
    if (this._debug) this._log("processQueue")

    // If no one has locked, and queue is not empty, we should try and proceed to next item if any
    while (this._readers == 0 && this._syncQueue.length > 0) {
      const queueItem = this._syncQueue.shift()

      if (queueItem) {
        if (this._debug) this._log("Process next job")
        await this._runJob(queueItem)
      }
    }
  }

  async _runJob(item) {
    this._readers++

    try {
      const result = await item.callback()
      item.resolve(result)
    } catch (error) {
      item.reject(error)
    } finally {
      this._readers--
    }
  }
}
