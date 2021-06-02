module.exports = class ReadersWriterLock {
  constructor(args = {}) {
    this._debug = args.debug
    this._readers = 0
    this._writers = 0
    this._processQueueTimeout = null
    this._readQueue = []
    this._writeQueue = []
  }

  read(callback) {
    if (this._debug) this._log("read")
    return new Promise((resolve, reject) => {
      this._readWithResolve({callback, resolve, reject})
    })
  }

  write(callback) {
    if (this._debug) this._log("write")
    return new Promise((resolve, reject) => {
      this._writeWithResolve({callback, resolve, reject})
    })
  }

  _log(message) {
    console.log("ReadersWriteLock", message, JSON.stringify({readers: this._readers, writers: this._writers}))
  }

  _readWithResolve(item) {
    if (this._writers > 0) {
      if (this._debug) this._log("Queue read")
      this._readQueue.push(item)
    } else {
      if (this._debug) this._log("Process read")
      this._processRead(item)
    }
  }

  _writeWithResolve(item) {
    if (this._readers > 0 || this._writers > 0) {
      if (this._debug) this._log("Queue write")
      this._writeQueue.push(item)
    } else {
      if (this._debug) this._log("Process write")
      this._processWrite(item)
    }
  }

  async _processRead(item) {
    this._readers++

    try {
      await item.callback()
      item.resolve()
    } catch (error) {
      item.reject(error)
    } finally {
      this._readers--
      this._processQueueLater()
    }
  }

  async _processWrite(item) {
    this._writers++

    try {
      await item.callback()
      item.resolve()
    } catch (error) {
      item.reject(error)
    } finally {
      this._writers--
      this._processQueueLater()
    }
  }

  _processQueueLater() {
    if (this._processQueueTimeout) {
      clearTimeout(this._processQueueTimeout)
    }

    this._processQueueTimeout = setTimeout(() => this._processQueue(), 0)
  }

  _processQueue() {
    if (this._writers == 0) {
      // If no one has begun writing, we should try and proceed to next read item if any
      const readQueueItem = this._readQueue.shift()

      if (readQueueItem) {
        if (this._debug) this._log("Process next read")
        this._processRead(readQueueItem)
      } else if (this._readers == 0) {
        // No writers, no next item to read - we should try and proceed to next write item if any
        const writeQueueItem = this._writeQueue.shift()

        if (writeQueueItem) {
          if (this._debug) this._log("Process next write")
          this._processWrite(writeQueueItem)
        }
      }
    }
  }
}
