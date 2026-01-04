/**
 * @typedef {Object} ReadersWriterLockOptions
 * @property {boolean} [debug]
 */

/**
 * Readers-writer lock with read priority.
 */
export default class ReadersWriterLock {
  /**
   * @param {ReadersWriterLockOptions} [args]
   */
  constructor(args = {}) {
    this._debug = args.debug
    this._readers = 0
    this._writers = 0
    this._processQueueTimeout = null
    /** @type {Array<ReadersWriterQueueItem<unknown>>} */
    this._readQueue = []
    /** @type {Array<ReadersWriterQueueItem<unknown>>} */
    this._writeQueue = []
  }

  /**
   * Run a job with shared read access.
   * @template T
   * @param {(() => (T | Promise<T>))} [callback]
   * @returns {Promise<T | undefined>}
   */
  read(callback) {
    if (this._debug) this._log("read")

    if (this._readers === 0 && this._writers === 0 && this._readQueue.length === 0 && this._writeQueue.length === 0) {
      return this.runReadJobInstantly(callback)
    }

    return new Promise((resolve, reject) => {
      /** @type {ReadersWriterQueueItem<T>} */
      const queueItem = {callback, resolve, reject}

      this._readWithResolve(/** @type {ReadersWriterQueueItem<unknown>} */ (queueItem))
    })
  }

  /**
   * Run a job with exclusive write access.
   * @template T
   * @param {(() => (T | Promise<T>))} [callback]
   * @returns {Promise<T | undefined>}
   */
  write(callback) {
    if (this._debug) this._log("write")

    if (this._readers === 0 && this._writers === 0 && this._readQueue.length === 0 && this._writeQueue.length === 0) {
      return this.runWriteJobInstantly(callback)
    }

    return new Promise((resolve, reject) => {
      /** @type {ReadersWriterQueueItem<T>} */
      const queueItem = {callback, resolve, reject}

      this._writeWithResolve(/** @type {ReadersWriterQueueItem<unknown>} */ (queueItem))
    })
  }

  /**
   * @template T
   * @param {(() => (T | Promise<T>))} [callback]
   * @returns {Promise<T | undefined>}
   */
  async runReadJobInstantly(callback) {
    this._readers++

    try {
      let result

      if (callback) result = await callback()
      return result
    } finally {
      this._readers--

      if (this._readQueue.length > 0 || this._writeQueue.length > 0) {
        this._processQueueLater()
      }
    }
  }

  /**
   * @template T
   * @param {(() => (T | Promise<T>))} [callback]
   * @returns {Promise<T | undefined>}
   */
  async runWriteJobInstantly(callback) {
    this._writers++

    try {
      let result

      if (callback) result = await callback()
      return result
    } finally {
      this._writers--

      if (this._readQueue.length > 0 || this._writeQueue.length > 0) {
        this._processQueueLater()
      }
    }
  }

  /**
   * @param {string} message
   * @returns {void}
   */
  _log(message) {
    console.log("ReadersWriteLock", message, JSON.stringify({readers: this._readers, writers: this._writers}))
  }

  /**
   * @param {ReadersWriterQueueItem<unknown>} item
   * @returns {void}
   */
  _readWithResolve(item) {
    if (this._writers > 0) {
      if (this._debug) this._log("Queue read")
      this._readQueue.push(item)
    } else {
      if (this._debug) this._log("Process read")
      this._processRead(item)
    }
  }

  /**
   * @param {ReadersWriterQueueItem<unknown>} item
   * @returns {void}
   */
  _writeWithResolve(item) {
    if (this._readers > 0 || this._writers > 0) {
      if (this._debug) this._log("Queue write")
      this._writeQueue.push(item)
    } else {
      if (this._debug) this._log("Process write")
      this._processWrite(item)
    }
  }

  /**
   * @param {ReadersWriterQueueItem<unknown>} item
   * @returns {Promise<void>}
   */
  async _processRead(item) {
    this._readers++

    try {
      let result

      if (item.callback) result = await item.callback()
      await item.resolve(result)
    } catch (error) {
      item.reject(error)
    } finally {
      this._readers--
      this._processQueueLater()
    }
  }

  /**
   * @param {ReadersWriterQueueItem<unknown>} item
   * @returns {Promise<void>}
   */
  async _processWrite(item) {
    this._writers++

    try {
      let result

      if (item.callback) result = await item.callback()
      await item.resolve(result)
    } catch (error) {
      item.reject(error)
    } finally {
      this._writers--
      this._processQueueLater()
    }
  }

  // First execute anything waiting after having given the lock back to the original caller by executing at the end of the event-queue by timeout-hack
  /**
   * @returns {void}
   */
  _processQueueLater() {
    if (this._processQueueTimeout) {
      clearTimeout(this._processQueueTimeout)
    }

    this._processQueueTimeout = setTimeout(this._processQueue, 0)
  }

  /**
   * @returns {void}
   */
  _processQueue = () => {
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

/**
 * @template T
 * @typedef {Object} ReadersWriterQueueItem
 * @property {(() => (T | Promise<T>)) | undefined} callback
 * @property {(value: T | undefined) => void} resolve
 * @property {(error: unknown) => void} reject
 */
