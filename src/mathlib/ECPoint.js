import { curveConfig } from "./constants.js";
import { findInverse, getModulo, getBN } from "./utils.js";

export default class ECPoint {
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
		let currentPoint = this;
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
