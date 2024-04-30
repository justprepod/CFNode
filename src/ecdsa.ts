import BN from "bignumber.js";

class ECPoint {
	x = null;
	y = null;
	EC = null;

	constructor(x, y, EC = curveConfig) {
		this.x = getBN(x);
		this.y = getBN(y);

		const y2 = this.y.pow(2);
		const x3PxaPb = this.x
			.pow(3)
			.plus(this.x.multipliedBy(EC.a))
			.plus(EC.b);

		if (!getModulo(x3PxaPb.minus(y2), EC.p).isEqualTo(0)) {
			throw new Error("The point is not on the curve");
		}
		this.EC = EC;
	}

	multiply(t) {
		let times = getBN(t);
		let n = getBN(1);
		let currentPoint : ECPoint = this;
		const usedPoints = [];

		if (times.isLessThan(0)) {
			times = times.multipliedBy(-1);
			currentPoint = new ECPoint(this.x, this.y.multipliedBy(-1));
		}

		while (n.isLessThan(times)) {
			usedPoints.push({ n, point: currentPoint });
			if (n.plus(n).isLessThanOrEqualTo(times)) {
				currentPoint = currentPoint.add(currentPoint);
				n = n.plus(n);
			} else {
				let greatestRelevantPoint = usedPoints.at(0);
				usedPoints.forEach((value) => {
					if (
						n.plus(value.n).isLessThanOrEqualTo(times) &&
						!value.point.x.isEqualTo(currentPoint.x)
					) {
						greatestRelevantPoint = value;
					}
				});
				currentPoint = currentPoint.add(greatestRelevantPoint.point);
				n = n.plus(greatestRelevantPoint.n);
			}
		}
		return currentPoint;
	}

	isEqualTo(point) {
		return point.x.isEqualTo(this.x) && point.y.isEqualTo(this.y);
	}

	add(point) {
		let alpha = this.isEqualTo(point)
			? getModulo(
					getBN(
						this.x.pow(2).multipliedBy(3).plus(this.EC.a)
					).multipliedBy(
						findInverse(this.y.multipliedBy(2), this.EC.p)
					),
					this.EC.p
			  )
			: getModulo(
					getBN(point.y.minus(this.y)).multipliedBy(
						findInverse(point.x.minus(this.x), this.EC.p)
					),
					this.EC.p
			  );
		const x = getModulo(
			alpha.pow(2).minus(this.x).minus(point.x),
			this.EC.p
		);
		const y = getModulo(
			this.x.minus(x).multipliedBy(alpha).minus(this.y),
			this.EC.p
		);
		return new ECPoint(x, y, this.EC);
	}
}

const curveConfig = {
    a: new BN(0),
    b: new BN(7),
    p: new BN(
        "115792089237316195423570985008687907853269984665640564039457584007908834671663"
    ),
};

const generatorPoint = {
    x: new BN(
        "55066263022277343669578718895168534326250603453777594175500187360389116729240"
    ),
    y: new BN(
        "32670510020758816978083085130507043184471273380659243275938904335757337482424"
    ),
    orderN: new BN(
        "115792089237316195423570985008687907852837564279074904382605163141518161494337"
    ),
};

export function getBN(number, type = 10) {
	return new BN(number, type);
}

export function getLargeRandom() {
	return [0, 0, 0].map(() => Math.floor(Math.random() * 10e10)).join("");
}

export function findInverse(number, modulo) {
	const xgcdBN = (a, b) => {
		if (b.isEqualTo(0)) {
			return [getBN(1), getBN(0)];
		}

		const [x, y] = xgcdBN(
			b,
			a.minus(a.dividedBy(b).integerValue(BN.ROUND_FLOOR).multipliedBy(b))
		);

		return [
			y,
			x.minus(
				y.multipliedBy(a.dividedBy(b).integerValue(BN.ROUND_FLOOR))
			),
		];
	};

	const [result] = xgcdBN(getBN(number), getBN(modulo));

	return result;
}

export function getModulo(bigNumber, modulo) {
	if (bigNumber.isGreaterThanOrEqualTo(0)) {
		return bigNumber.modulo(modulo);
	}

	return getBN(modulo)
		.minus(bigNumber.multipliedBy(-1).mod(modulo))
		.mod(modulo);
}

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
