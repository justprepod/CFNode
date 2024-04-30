import ECPoint from "./ECPoint.js";
import { curveConfig, generatorPoint } from "./constants.js";
import { findInverse, getModulo, getBN, getLargeRandom } from "./utils.js";

export function getSecp256k1Point(x, y) {
	return new ECPoint(x, y, curveConfig);
}

export const GPoint = getSecp256k1Point(generatorPoint.x, generatorPoint.y);

export function signMessage(message, privateKey) {
	let k;
	let r;
	let s;

	do {
		do {
			k = getLargeRandom();

			const R = GPoint.multiply(k);
			r = getModulo(R.x, generatorPoint.orderN);
		} while (r.isEqualTo(0));

		const kInverse = getModulo(
			findInverse(k, generatorPoint.orderN),
			generatorPoint.orderN
		);

		s = getModulo(
			kInverse.multipliedBy(
				getBN(message, 16).plus(
					getModulo(
						r.multipliedBy(privateKey, 16),
						generatorPoint.orderN
					)
				)
			),
			generatorPoint.orderN
		);
	} while (s.isGreaterThan(generatorPoint.orderN.dividedBy(2)));

	return {
		s: "0x" + s.toString(16),
		r: "0x" + r.toString(16),
		recoveryParam: r % 2,
	};
}
