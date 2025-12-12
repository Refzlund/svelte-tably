export type WideRow = {
	id: number
	name: string
	email: string
	maturity: string
	colA: string
	colB: string
	colC: string
	colD: string
	colE: string
	colF: string
}

export function createWideData(count: number = 50): WideRow[] {
	return Array.from({ length: count }, (_, i) => {
		const n = i + 1
		return {
			id: n,
			name: `Person ${n}`,
			email: `person.${n}@example.com`,
			maturity: n % 2 === 0 ? 'Adult' : 'Adolescent',
			colA: `A-${n} — lorem ipsum dolor sit amet`,
			colB: `B-${n} — consectetur adipiscing elit`,
			colC: `C-${n} — sed do eiusmod tempor`,
			colD: `D-${n} — incididunt ut labore`,
			colE: `E-${n} — et dolore magna aliqua`,
			colF: `F-${n} — ut enim ad minim veniam`
		}
	})
}

export type SimpleRow = {
	name: string
	age: number
}

export function createSimpleData(): SimpleRow[] {
	return [
		{ name: 'Dog', age: 12 },
		{ name: 'Shiba', age: 21 },
		{ name: 'Cat', age: 28 },
		{ name: 'Pig', age: 10 },
		{ name: 'Crow', age: 30 },
		{ name: 'Giraffe', age: 26 }
	]
}
