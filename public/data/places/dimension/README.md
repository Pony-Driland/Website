## What is Pony Driland?

Pony Driland is an artificial dimension created by James and his brother. The original purpose of this dimension was to serve as an interdimensional bunker for temporarily evacuating their own planet from galactic wars, creating a safe environment where its inhabitants could live in peace and prepare to return to the original dimension with more powerful weapons to counterattack and defend their solar system against invaders.

Unfortunately, the project did not have enough time to be completed, and the planet was invaded shortly before the new technology was officially inaugurated for professional use. The interplanetary conquerors were already aware of the secret project and attempted to invade the planet precisely to try to steal this technology, even if it meant destroying and eradicating the entire planet.

Seeing that there was no longer any salvation and that the planet would be devastated and exploded, his brother, in a desperate act as a last resort, against James' will, placed him in the only available spaceship of their company, giving him a remote control to teleport himself to Pony Driland (which still did not bear this name) and sent him far into interstellar space. The second remote control received coordinates to be sent to Princess Ariella's castle on her home planet.

He finally activated the machine that sent the capsule containing a super-seed that would originate the dimension of Pony Driland, to an independent new reality completely empty, a perfect environment for the dimension to be born and establish itself. However, due to the delay for the dimension to be activated, before James' brother could try to use his third control, the final explosion killed him along with his home planet.

---

## Time-Dilation: Pony Driland Vs Earth

<ai>

On Earth, only seven minutes passed, but in Pony Driland this same interval was equal to four full days.
To understand this difference, we can treat it as a time-ratio calculation.


**Step 1 — Convert Pony Driland time into minutes:**

* 1 day = 24 hours
* 4 days = 4 × 24 = **96 hours**
* 96 hours × 60 minutes = **5,760 minutes**

**Step 2 — Write the time ratio to find the time-dilation factor:**

Now calculate it:

* 5760 ÷ 7 ≈ **822.857**

So the time-dilation factor becomes:

```
1 minute on Earth ≈ 822.857 minutes in Pony Driland
```

Which also means:

* **822.857 minutes ≈ 13.7 hours**

This means that **every 1 minute on Earth corresponds to about 823 minutes (13.7 hours) in Pony Driland**.
In other words, time in Pony Driland flows dramatically faster relative to Earth, creating a strong narrative effect where short events on one world can span long periods in the other.

</ai>

---

### Javascript version

```js
import { formatCustomTimer } from 'tiny-essentials/basics/clock'

/** Conversion time factor (Earth → Pony) */
const TIME_FACTOR = 5760 / 7; // ≈ 822.8571428571429

/**
 * @param {number} earthMinutes - Earth Minutes
 * @returns {number} Pony Driland minutes
 */
export const earthTimeToPony = (earthMinutes) => {
    // Convert Earth minutes to Pony Driland minutes
    return earthMinutes * TIME_FACTOR;
};

/**
 * @param {number} ponyMinutes - Pony Driland Minutes
 * @returns {number} Earth Minutes
 */
export const ponyTimeToEarth = (ponyMinutes) => {
    // Convert Pony Driland minutes back to Earth minutes
    return ponyMinutes / TIME_FACTOR;
};

formatCustomTimer(earthTimeToPony(1) * 60, 'days');
"13:42:51"

// 7 earth minutes = 4 pony driland days
formatCustomTimer(earthTimeToPony(7) * 60, 'days', '{days} day(s) {hours}:{minutes}:{seconds}');
"4 day(s) 00:00:00" 

formatCustomTimer(ponyTimeToEarth(5760) * 60, 'days');
"00:07:00"

formatCustomTimer(ponyTimeToEarth(5760 / 7) * 60, 'days');
 "00:01:00" 
```