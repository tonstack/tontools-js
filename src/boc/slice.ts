import type { Cell } from './cell'
import { Coins } from '../coins'
import { Address } from '../address'
import {
    bitsToHex,
    bitsToInt8,
    bitsToBytes,
    bytesToString
} from '../utils/helpers'

class Slice {
    private _bits: Bit[]

    private _refs: Cell[]

    /**
     * Creates an instance of {@link Slice}
     *
     * @param {Bit[]} bits
     * @param {Cell[]} refs
     *
     * @example
     * ```ts
     * import { Cell, Slice } from '@tonstack/tontools'
     *
     * const cell = new Cell()
     * const slice = new Slice(cell)
     * ```
     */
    constructor (bits: Bit[], refs: Cell[]) {
        this._bits = bits
        this._refs = refs
    }

    public get bits (): Bit[] {
        return Array.from(this._bits)
    }

    public get refs (): Cell[] {
        return Array.from(this._refs)
    }

    /**
     * Skip bits from {@link Slice}
     *
     * @param {number} size - Total bits should be skipped
     *
     * @example
     * ```ts
     * import { Cell, Slice } from '@tonstack/tontools'
     *
     * const cell = new Cell()
     *
     * cell.bits.writeBits([ 0, 1, 1, 0 ])
     *
     * const slice = cell.toSlice()
     *
     * console.log(slice.skip(2).readBits(2)) // [ 1, 0 ]
     * ```
     *
     * @return {this}
     */
    public skip (size: number): Slice {
        if (this._bits.length < size) {
            throw new Error('Slice: skip bits overflow.')
        }

        this._bits.splice(0, size)

        return this
    }

    /**
     * Read ref from {@link Slice}
     *
     * @example
     * ```ts
     * import { Cell, Slice } from '@tonstack/tontools'
     *
     * const cell = new Cell()
     * const ref = new Cell()
     *
     * cell.refs.push(ref)
     *
     * const slice = cell.toSlice()
     *
     * console.log(slice.readRef()) // Cell
     * ```
     *
     * @return {Cell}
     */
    public loadRef (): Cell {
        if (!this._refs.length) {
            throw new Error('Slice: refs overflow.')
        }

        return this._refs.shift()
    }

    public preloadRef (): Cell {
        if (!this._refs.length) {
            throw new Error('Slice: refs overflow.')
        }

        return this._refs[0]
    }

    /**
     * Read bit from {@link Slice}
     *
     * @example
     * ```ts
     * import { Cell, Slice } from '@tonstack/tontools'
     *
     * const cell = new Cell()
     *
     * cell.bits.writeBit(1)
     *
     * const slice = cell.toSlice()
     *
     * console.log(slice.readBit()) // 1
     * ```
     *
     * @return {Bit[]}
     */
    public loadBit (): Bit {
        if (!this._bits.length) {
            throw new Error('Slice: bits overflow.')
        }

        return this._bits.shift()
    }

    public preloadBit (): Bit {
        if (!this._bits.length) {
            throw new Error('Slice: bits overflow.')
        }

        return this._bits[0]
    }

    /**
     * Read bits from {@link Slice}
     *
     * @param {number} size - Total bits should be readed to represent requested value
     *
     * @example
     * ```ts
     * import { Cell, Slice } from '@tonstack/tontools'
     *
     * const cell = new Cell()
     *
     * cell.bits.writeBits([ 0, 1 ])
     *
     * const slice = cell.toSlice()
     *
     * console.log(slice.readBits(2)) // [ 0, 1 ]
     * ```
     *
     * @return {Bit[]}
     */
    public loadBits (size: number): Bit[] {
        if (size <= 0 || this._bits.length < size) {
            throw new Error('Slice: bits overflow.')
        }

        return this._bits.splice(0, size)
    }

    public preloadBits (size: number): Bit[] {
        if (size <= 0 || this._bits.length < size) {
            throw new Error('Slice: bits overflow.')
        }

        return this._bits.slice(0, size)
    }

    /**
     * Read int from {@link Slice}
     *
     * @param {number} size - Total bits should be readed to represent requested value
     *
     * @example
     * ```ts
     * import { Cell, Slice } from '@tonstack/tontools'
     *
     * const cell = new Cell()
     *
     * cell.bits.writeUint(-14, 15)
     *
     * const slice = cell.toSlice()
     *
     * console.log(slice.readUint(15)) // -14
     * ```
     *
     * @return {number}
     */
    public loadInt (size: number): number {
        const uint = this.loadUint(size)
        const int = 1 << (size - 1)

        return uint >= int ? (uint - (int * 2)) : uint
    }

    public preloadInt (size: number): number {
        const uint = this.preloadUint(size)
        const int = 1 << (size - 1)

        return uint >= int ? (uint - (int * 2)) : uint
    }

    /**
     * Read uint from {@link Slice}
     *
     * @param {number} size - Total bits should be readed to represent requested value
     *
     * @example
     * ```ts
     * import { Cell, Slice } from '@tonstack/tontools'
     *
     * const cell = new Cell()
     *
     * cell.bits.writeUint(14, 9)
     *
     * const slice = cell.toSlice()
     *
     * console.log(slice.readUint(9)) // 14
     * ```
     *
     * @return {number}
     */
    public loadUint (size: number): number {
        const bits = this.loadBits(size)

        return bits.reverse().reduce((acc, bit, i) => (bit * (2 ** i) + acc), 0)
    }

    public preloadUint (size: number): number {
        const bits = this.preloadBits(size)

        return bits.reverse().reduce((acc, bit, i) => (bit * (2 ** i) + acc), 0)
    }

    /**
     * Read bytes from {@link Slice}
     *
     * @example
     * ```ts
     * import { Cell, Slice } from '@tonstack/tontools'
     *
     * const cell = new Cell()
     *
     * cell.bits.writeBytes(new Uint8Array([ 255, 255 ]))
     *
     * const slice = cell.toSlice()
     *
     * console.log(slice.readBytes(16)) // [ 255, 255 ]
     * ```
     *
     * @return {Uint8Array}
     */
    public loadBytes (size: number): Uint8Array {
        const bits = this.loadBits(size)

        return bitsToBytes(bits)
    }

    public preloadBytes (size: number): Uint8Array {
        const bits = this.preloadBits(size)

        return bitsToBytes(bits)
    }

    /**
     * Read string from {@link Slice}
     *
     * @param {number} [size=null] - Total bits should be readed to represent requested value
     *
     * @example
     * ```ts
     * import { Cell, Slice } from '@tonstack/tontools'
     *
     * const cell = new Cell()
     *
     * cell.bits.writeString('Привет, мир!')
     *
     * const slice = cell.toSlice()
     *
     * console.log(slice.readString()) // 'Привет, мир!'
     * ```
     *
     * @return {string}
     */
    public loadString (size: number = null): string {
        const bytes = size === null
            ? this.loadBytes(this._bits.length)
            : this.loadBytes(size)

        return bytesToString(bytes)
    }

    public preloadString (size: number = null): string {
        const bytes = size === null
            ? this.preloadBytes(this._bits.length)
            : this.preloadBytes(size)

        return bytesToString(bytes)
    }

    /**
     * Read {@link Address} from {@link Slice}
     *
     * @example
     * ```ts
     * import { Cell, Address, Slice } from '@tonstack/tontools'
     *
     * const cell = new Cell()
     * const address = new Address('kf_8uRo6OBbQ97jCx2EIuKm8Wmt6Vb15-KsQHFLbKSMiYIny')
     *
     * cell.bits.writeAddress(address)
     *
     * const slice = cell.toSlice()
     *
     * console.log(slice.readAddress().toString())
     * // 'kf_8uRo6OBbQ97jCx2EIuKm8Wmt6Vb15-KsQHFLbKSMiYIny'
     * ```
     *
     * @return {Address}
     */
    public loadAddress (): Address | null {
        const FLAG_ADDRESS_NO = [ 0, 0 ]
        const FLAG_ADDRESS = [ 1, 0 ]
        const flag = this.preloadBits(2)

        if (flag.every((bit, i) => bit === FLAG_ADDRESS_NO[i])) {
            return this.skip(2) && Address.NONE
        }

        if (flag.every((bit, i) => bit === FLAG_ADDRESS[i])) {
            // 2 bits flag, 1 bit anycast, 8 bits workchain, 256 bits address hash
            const size = 2 + 1 + 8 + 256
            const bits = this.preloadBits(size)
            // Splice 2 because we dont need flag bits
            // Anycast is currently unused
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const anycast = bits.splice(2, 1)
            const workchain = bitsToInt8(bits.splice(2, 8))
            const hash = bitsToHex(bits.splice(2, 256))
            const raw = `${workchain}:${hash}`

            return this.skip(size) && new Address(raw)
        }

        throw new Error('Slice: bad address flag bits.')
    }

    public preloadAddress (): Address | null {
        const FLAG_ADDRESS_NO = [ 0, 0 ]
        const FLAG_ADDRESS = [ 1, 0 ]
        const flag = this.preloadBits(2)

        if (flag.every((bit, i) => bit === FLAG_ADDRESS_NO[i])) {
            return Address.NONE
        }

        if (flag.every((bit, i) => bit === FLAG_ADDRESS[i])) {
            // 2 bits flag, 1 bit anycast, 8 bits workchain, 256 bits address hash
            const size = 2 + 1 + 8 + 256
            const bits = this.preloadBits(size)
            // Splice 2 because we dont need flag bits
            // Anycast is currently unused
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const anycast = bits.splice(2, 1)
            const workchain = bitsToInt8(bits.splice(2, 8))
            const hash = bitsToHex(bits.splice(2, 256))
            const raw = `${workchain}:${hash}`

            return new Address(raw)
        }

        throw new Error('Slice: bad address flag bits.')
    }

    /**
     * Read {@link Coins} from {@link Slice}
     *
     * @example
     * ```ts
     * import { Cell, Coins, Slice } from '@tonstack/tontools'
     *
     * const cell = new Cell()
     * const coins = new Coins('100')
     *
     * cell.bits.writeCoins(coins)
     *
     * const slice = cell.toSlice()
     *
     * console.log(slice.readCoins().toString()) // '100'
     * ```
     *
     * @return {Coins}
     */
    public loadCoins (): Coins {
        const length = this.preloadUint(4)

        if (length === 0) {
            return this.skip(4) && new Coins(0)
        }

        const size = 4 + (length * 8)
        const bits = this.preloadBits(size)
        const hex = `0x${bitsToHex(bits.splice(4))}`

        return this.skip(size) && new Coins(hex, true)
    }

    public preloadCoins (): Coins {
        const length = this.preloadUint(4)

        if (length === 0) {
            return new Coins(0)
        }

        const size = 4 + (length * 8)
        const bits = this.preloadBits(size)
        const hex = `0x${bitsToHex(bits.splice(4))}`

        return new Coins(hex, true)
    }
}

export { Slice }
