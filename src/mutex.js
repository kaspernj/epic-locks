/**
 * @typedef {Object} MutexOptions
 * @property {boolean} [debug]
 */

/**
 * Mutex for running async work sequentially.
 */
export default class Mutex {
  /**
   * @param {MutexOptions} [args]
   */
  constructor(args = {}) {
    this._debug = args.debug
    this._readers = 0
    this._processQueueTimeout = null
    /** @type {Array<MutexQueueItem<unknown>>} */
    this._syncQueue = []
  }

  /**
   * Run a job with exclusive access.
   * @template T
   * @param {() => (T | Promise<T>)} callback
   * @returns {Promise<T>}
   */
  sync(callback) {
    if (this._debug) this._log("sync")

    if (this._readers === 0 && this._syncQueue.length === 0) {
      return this.runJobInstantly(callback)
    }

    return new Promise((resolve, reject) => {
      /** @type {MutexQueueItem<T>} */
      const queueItem = {callback, resolve, reject}

      this._syncQueue.push(/** @type {MutexQueueItem<unknown>} */ (queueItem))
      this._processQueueLater()
    })
  }

  /**
   * @template T
   * @param {() => (T | Promise<T>)} callback
   * @returns {Promise<T>}
   */
  async runJobInstantly(callback) {
    this._readers++

    try {
      return await callback()
    } finally {
      this._readers--

      if (this._readers === 0 && this._syncQueue.length > 0) {
        this._processQueueLater()
      }
    }
  }

  /**
   * @param {string} message
   * @returns {void}
   */
  _log(message) {
    console.log("ReadersWriteLock", message, JSON.stringify({readers: this._readers}))
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
   * @returns {Promise<void>}
   */
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

  /**
   * @param {MutexQueueItem<unknown>} item
   * @returns {Promise<void>}
   */
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

/**
 * @template T
 * @typedef {Object} MutexQueueItem
 * @property {() => (T | Promise<T>)} callback
 * @property {(value: T) => void} resolve
 * @property {(error: unknown) => void} reject
 */
