module.exports = class ReadersWriterLock {
  constructor(args = {}) {
    this.debug = args.debug
    this.readers = 0
    this.writers = 0
    this.processQueueTimeout = null
    this.readQueue = []
    this.writeQueue = []
  }

  read(callback) {
    if (this.debug) this._log("read")
    return new Promise((resolve, reject) => {
      this._readWithResolve({callback, resolve, reject})
    })
  }

  write(callback) {
    if (this.debug) this._log("write")
    return new Promise((resolve, reject) => {
      this._writeWithResolve({callback, resolve, reject})
    })
  }

  _log(message) {
    console.log("ReadersWriteLock", message, JSON.stringify({readers: this.readers, writers: this.writers}))
  }

  _readWithResolve(item) {
    if (this.writers > 0) {
      if (this.debug) this._log("Queue read")
      this.readQueue.push(item)
    } else {
      if (this.debug) this._log("Process read")
      this._processRead(item)
    }
  }

  _writeWithResolve(item) {
    if (this.readers > 0 || this.writers > 0) {
      if (this.debug) this._log("Queue write")
      this.writeQueue.push(item)
    } else {
      if (this.debug) this._log("Process write")
      this._processWrite(item)
    }
  }

  async _processRead(item) {
    this.readers++

    try {
      await item.callback()
      item.resolve()
    } catch (error) {
      item.reject(error)
    } finally {
      this.readers--
      this._processQueueLater()
    }
  }

  async _processWrite(item) {
    this.writers++

    try {
      await item.callback()
      item.resolve()
    } catch (error) {
      item.reject(error)
    } finally {
      this.writers--
      this._processQueueLater()
    }
  }

  _processQueueLater() {
    if (this.processQueueTimeout) {
      clearTimeout(this.processQueueTimeout)
    }

    this.processQueueTimeout = setTimeout(() => this._processQueue(), 0)
  }

  _processQueue() {
    if (this.writers == 0) {
      // If no one has begun writing, we should try and proceed to next write item
      const readQueueItem = this.readQueue.shift()

      if (readQueueItem) {
        if (this.debug) this._log("Process next read")
        this._processRead(readQueueItem)
      } else if (this.readers == 0) {
        // No writers, no next item to read - we should try and proceed to next write item if any
        const writeQueueItem = this.writeQueue.shift()

        if (writeQueueItem) {
          if (this.debug) this._log("Process next write")
          this._processWrite(writeQueueItem)
        }
      }
    }
  }
}
