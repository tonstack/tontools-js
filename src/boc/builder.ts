import { Cell } from './cell'
import type { Slice } from './slice'
import type { Address } from '../address'
import type { Coins } from '../coins'
import {
    bitsToBytes,
    stringToBytes
} from '../utils/helpers'

type Bit = 0 | 1

class Builder {
    private _size: number

    private _refs: Cell[]

    private _bits: Bit[]

    constructor (size: number = 1023) {
        this._size = size
        this._bits = []
        this._refs = []
    }

    private checkBitsOverflow (size: number): void {
        if (size > this.remainder) {
            throw new Error(`Builder: bits overflow. Can't add ${size} bits. Only ${this.remainder} bits left.`)
        }
    }

    private checkRefsOverflow (size: number): void {
        if (size > (4 - this._refs.length)) {
            throw new Error(`Builder: refs overflow. Can't add ${size} refs. Only ${4 - this._refs.length} refs left.`)
        }
    }

    private storeNumber (value: bigint, length: number): this {
        const bits = [ ...Array(length) ]
            .map((_el, i) => Number(((value >> BigInt(i)) & 1n) === 1n) as Bit)
            .reverse()

        this.storeBits(bits)

        return this
    }

    /**
     * Returns instance maximum allowed size in bits.
     *
     * @readonly
     * @type {number}
     */
    public get size (): number {
        return this._size
    }

    /**
     * Returns instance stored bits {@link Bit}.
     *
     * @readonly
     * @type {Bit[]}
     */
    public get bits (): Bit[] {
        return Array.from(this._bits)
    }

    /**
     * Returns instance stored bits in bytes.
     *
     * @readonly
     * @type {Uint8Array}
     */
    public get bytes (): Uint8Array {
        return bitsToBytes(this._bits)
    }

    /**
     * Returns instance stored refs {@link Cell}.
     *
     * @readonly
     * @type {Cell[]}
     */
    public get refs (): Cell[] {
        return Array.from(this._refs)
    }

    /**
     * Returns instance unused space in bits.
     *
     * @readonly
     * @type {number}
     */
    public get remainder (): number {
        return this._size - this._bits.length
    }

    /**
     * Merge {@link Slice} into instance.
     * 
     * @param {Slice} slice - An instance of a {@link Slice}.
     * @return {this}
     */
    public storeSlice (slice: Slice): this {
        const bits = slice.bits
        const refs = slice.refs

        this.checkBitsOverflow(bits.length)
        this.checkRefsOverflow(refs.length)
        this.storeBits(bits)

        refs.forEach((ref) => this.storeRef(ref))

        return this
    }

    /**
     * Add cell to instance refs
     * 
     * @param {Cell} ref - Cell
     * @return {this}
     */
    public storeRef (ref: Cell): this {
        this.checkRefsOverflow(1)
        this._refs.push(ref)

        return this
    }

    /**
     * Store one bit in instance.
     * 
     * @param {(Bit | number)} bit - 1 or 0.
     * @return {this}
     */
    public storeBit (bit: Bit | number): this {
        if (bit !== 0 && bit !== 1) {
            throw new Error('Builder: can\'t store bit, because it\'s value doesn\'t equals 0 nor 1.')
        }

        this.checkBitsOverflow(1)
        this._bits.push(bit)

        return this
    }

    /**
     * Store multiple bits as array in instance.
     * 
     * @param {(Bit[] | number[])} bits - Array of 1 and/or 0.
     * @return {this}
     */
    public storeBits (bits: Bit[]): this {
        this.checkBitsOverflow(bits.length)

        bits.forEach(this.storeBit.bind(this))

        return this
    }

    /**
     * Store an integer in instance.
     * 
     * @param {(number | bigint)} value - Int.
     * @param {number} length - Size in bits of allocated space for value.
     * @return {this}
     */
    public storeInt (value: number | bigint, length: number): this {
        const int = BigInt(value)
        const intBits = 1n << (BigInt(length) - 1n)

        if (int < -intBits || int >= intBits) {
            throw new Error('Builder: can\'t store an Int, because its value allocates more space than provided.')
        }

        this.storeNumber(int, length)

        return this
    }

    /**
     * Store an unsigned integer in instance.
     * 
     * @param {(number | bigint)} value - UInt.
     * @param {number} length - Size in bits of allocated space for value.
     * @return {this}
     */
    public storeUint (value: number | bigint, length: number): this {
        const uint = BigInt(value)

        if (uint < 0 || uint >= (1n << BigInt(length))) {
            throw new Error('Builder: can\'t store an UInt, because its value allocates more space than provided.')
        }

        this.storeNumber(uint, length)

        return this
    }

    /**
     * Store a bytes array in instance.
     * 
     * @param {(Uint8Array | number[])} value - Array of bytes.
     * @return {this}
     */
    public storeBytes (value: Uint8Array | number[]): this {
        this.checkBitsOverflow(value.length * 8)

        Uint8Array.from(value).forEach((byte: number) => this.storeUint(byte, 8))

        return this
    }

    /**
     * Store a string in instance.
     * 
     * @param {string} value - Any string, Unicode is suppported.
     * @return {this}
     */
    public storeString (value: string): this {
        const bytes = stringToBytes(value)

        this.storeBytes(bytes)

        return this
    }

    /**
     * Store an {@link Address} in instance.
     * 
     * @param {(Address | null)} address - Smart contract address as {@link Address} or as null.
     * @return {this}
     */
    public storeAddress (address: Address | null): this {
        if (address === null) {
            this.storeBits([ 0, 0 ])

            return this
        }

        const anycast = 0
        const addressBitsSize = 2 + 1 + 8 + 256

        this.checkBitsOverflow(addressBitsSize)
        this.storeBits([ 1, 0 ])
        this.storeUint(anycast, 1)
        this.storeInt(address.workchain, 8)
        this.storeBytes(address.hash)

        return this
    }

    /**
     * Store a {@link Coins} in instance.
     * 
     * @param {Coins} coins - Toncoin as {@link Coins}.
     * @return {this}
     */
    public storeCoins (coins: Coins): this {
        if (coins.isNegative()) {
            throw new Error('Builder: coins value can\'t be negative.')
        }

        if (coins.isZero()) {
            this.storeUint(0, 4)

            return this
        }

        const length = Math.ceil((BigInt(coins.toNano()).toString(16).length) / 2)
        const size = length * 8
        const nano = BigInt(coins.toNano())
        const coinsBitsSize = 4 + size

        this.checkBitsOverflow(coinsBitsSize)
        this.storeUint(length, 4)
        this.storeUint(nano, size)

        return this
    }

    /**
     * Returns this instance copy as a new instance.
     * 
     * @return {Builder}
     */
    public clone (): Builder {
        const data = new Builder(this._size)

        data.storeBits(Array.from(this._bits))

        return data
    }

    /**
     * Augment bits with 1 and leading 0 to be divisible by 8 or 4 without remainder.
     * Mostly used for {@link BoC} serialization or {@link Cell} hash calculations.
     * 
     * @param {Bit[]} bits - Bits which need to be augmented.
     * @param {(4 | 8)} [divider=8] - A divider after division by which there will be no remainder.
     * @return {Bit[]}
     */
    public static augmentBits (bits: Bit[], divider: 4 | 8 = 8): Bit[] {
        const amount = divider - (bits.length % divider)
        const overage = [ ...Array(amount) ].map((_el, i) => (i === 0 ? 1 : 0))

        if (overage.length !== 0 && overage.length !== divider) {
            bits = bits.concat(overage)
        }

        return bits
    }

    /**
     * Remove augmented bits.
     * Mostly used for {@link BoC} serialization or {@link Cell} hash calculations.
     * 
     * @param {Bit[]} bits - Bits which needs to be cleared from augmented bits.
     * @return {this}
     */
    public static rollbackBits (bits: Bit[]): Bit[] {
        const index = bits.slice(-7).reverse().indexOf(1)

        if (index === -1) {
            throw new Error('Builder: incorrectly augmented bits.')
        }

        bits.splice(-(index + 1))

        return bits
    }

    /**
     * Returns builded {@link Cell}.
     * 
     * @return {Cell}
     * 
     * @example
     * ```typescript
     * import { Builder } from '@tonstack/tontools'
     * 
     * const bits = [ 1, 0, 0, 1 ]
     * const cell = new Builder(bits.length)
     *     .storeBits(bits)
     *     .cell()
     * ```
     */
    public cell (): Cell {
        // Use getters to get copies of an arrays
        const cell = new Cell(this.bits, this.refs, false)

        return cell
    }
}

export {
    Builder,
    Bit
}
