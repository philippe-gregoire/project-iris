import COS from 'api/COS'

const IMAGE_REGEX = /.(jpg|jpeg|png)$/i
const optional = p => p.catch(() => undefined)

const VERSION = '1.0'
export default class Collection {
  static UNDEFINED_COLLECTION = 'undefined_collection'
  static LOCALIZATION = 'localization'
  static CLASSIFICATION = 'classification'

  #type = ''
  #labels = []
  #images = {}
  #annotations = {}

  constructor(type, labels, images, annotations) {
    this.#type = type
    this.#labels = labels
    this.#images = images
    this.#annotations = annotations
  }

  static get EMPTY() {
    return new Collection('', [], { all: [], labeled: [], unlabeled: [] }, {})
  }

  static load(endpoint, bucket) {
    const Bucket = new COS(endpoint).bucket(bucket)
    const collectionPromise = optional(Bucket.collection())
    const fileListPromise = Bucket.fileList()
    return Promise.all([collectionPromise, fileListPromise]).then(res => {
      const [collection, fileList] = res
      const images = fileList.filter(fileName => fileName.match(IMAGE_REGEX))
      if (collection) {
        const labeled = collection.images.labeled
        const unlabeled = images.filter(image => !labeled.includes(image))
        collection.images.unlabeled = unlabeled
        collection.images.all = [...unlabeled, ...labeled]
        return collection
      } else {
        // return Promise.reject(Collection.UNDEFINED_COLLECTION)
        return {
          type: null,
          labels: [],
          images: { all: images, labeled: [], unlabeled: images },
          annotations: {}
        }
      }
    })
  }

  setType(type, syncComplete) {
    // TODO: Actually sync the changes.
    setTimeout(syncComplete, 3000)
    return new Collection(type, this.#labels, this.#images, this.#annotations)
  }

  get type() {
    return this.#type
  }

  get labels() {
    return this.#labels
  }

  get images() {
    return this.#images
  }

  get annotations() {
    return this.#annotations
  }

  toJSON() {
    return {
      version: VERSION,
      type: this.#type,
      labels: this.#labels,
      images: this.#images,
      annotations: this.#annotations
    }
  }
}
