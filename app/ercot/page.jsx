import Link from "next/link";
import ErcotModel from "../../components/ercot/ErcotModel";

export const metadata = {
  title: "ercot nodal prices · keerthik.dev",
  description:
    "An eight-bus ERCOT dispatch model: how locational prices, congestion and the best place to site storage move as a home-battery fleet scales.",
};

export default function Ercot() {
  return (
    <main className="page page--wide">
      <h1>where the next battery goes</h1>
      <p className="subtitle">
        an eight-bus ERCOT dispatch model, and what a home-battery fleet does to it
      </p>

      <p>
        Every one of ERCOT&rsquo;s 18,000-odd electrical buses gets its own five-minute price, but
        fewer than 1,000 of them are settlement points, and residential load is settled at four Load
        Zone averages. So a home battery is paid a number that is an average over a region it sits
        somewhere inside. This page solves a security-constrained dispatch across a reduced
        eight-bus Texas, prices every bus off the shadow prices of the binding constraints, and
        then grows a fleet of home batteries against it.
      </p>

      <p>
        The price at bus <code>b</code> is <code>LMP_b = &lambda; &minus; &Sigma;_k SF_b,k &middot; &mu;_k</code>:
        one system-wide energy component, minus this bus&rsquo;s shift factor on each binding
        constraint times that constraint&rsquo;s shadow price. Everything below is read off the
        duals of the dispatch, not fitted to anything.
      </p>

      <ErcotModel />

      <h2>what the model says</h2>
      <ol>
        <li>
          <b>Congestion lives in surplus hours, not peak hours.</b> On the mild spring day the
          Panhandle sits pinned at &minus;$8 for sixteen hours behind its export constraint while the
          South coast clears near $30 &mdash; a $38 basis that is entirely congestion. On the summer
          peak evening, nothing binds at all. West Texas is not export-constrained when the whole
          state wants the power.
        </li>
        <li>
          <b>Cheap is not the same as valuable.</b> The Panhandle is the worst place on the system to
          put a battery despite being the cheapest bus on it. A binding export constraint depresses
          the price <i>level</i> all day; it does not create a <i>time</i> spread, and storage is only
          ever paid for moving energy through time. Reading a congestion map as a siting map points
          you exactly the wrong way. Capturing a spatial basis is what transmission and congestion
          revenue rights are for.
        </li>
        <li>
          <b>Firmness dominates arbitrage by two orders of magnitude.</b> On the winter morning the
          fleet earns around $5.50 per kW per day against roughly $0.03 on a mild spring day, and
          takes unserved energy from 18.3 GWh down to 2.9 GWh. Whatever the economics of a home
          battery are, on the days that matter they are not about the spread.
        </li>
      </ol>

      <h2>how it works</h2>
      <p>
        Each hour is a linear program: meet load at least cost, subject to every unit&rsquo;s
        capability, a DC representation of the network, and an aggregate reserve requirement bought
        against a price-responsive demand curve. Shift factors come from the network&rsquo;s
        susceptance matrix with a load-weighted distributed reference, the way ERCOT uses a
        distributed slack rather than a single swing bus. Two Generic Transmission Constraints sit
        on top of the individual line ratings, because ERCOT&rsquo;s largest limits are stability
        limits on the <i>sum</i> of flows across a set of monitored elements rather than thermal
        limits on any one of them.
      </p>
      <p>
        Storage is a price taker. Each fleet solves its own best arbitrage against the price series
        it is actually settled at, by dynamic programming over state of charge with a cyclic daily
        constraint, 86% round trip and $4/MWh of throughput for degradation. Its schedule and the
        price are then iterated to a fixed point by the method of successive averages &mdash; a
        fleet that best-responds at full step swings in unison and the iteration never settles.
      </p>
      <p>
        The one control that changes the physics is <i>settled at</i>. A retail electric provider is
        paid the Load Zone price; a registered resource is paid its own bus. Switching it does not
        change what the batteries are, only what they can see, and the gap between the two settings
        is the honest measure of what nodal participation is worth.
      </p>
      <p>
        The solver is checked rather than trusted: shift factors reproduce an independently coded DC
        power flow, an unconstrained hour prices every bus at &lambda;, and the LMP at all eight
        buses equals the derivative of total dispatch cost with respect to load at that bus, by
        finite difference, in congested and scarcity cases alike. See{" "}
        <code>tests/ercot.test.js</code>.
      </p>

      <h2>where the numbers come from</h2>
      <p>
        Fleet totals and market rules are ERCOT&rsquo;s published figures: 40,737 MW of wind and
        39,794 MW of utility-scale solar as of July 2026, 14 GW of grid batteries entering 2026,
        4,970 MW of nuclear, and roughly 13 GW of coal, 41 GW of combined cycle and 17 GW of
        peaking capacity. The summer day is anchored to the{" "}
        <a href="https://www.eia.gov/todayinenergy/detail.php?id=67906">
          91.1 GW record peak of 22 July 2026
        </a>
        , met 48% by gas and 32% by solar &mdash; which is why the solar shape here holds its output
        so late and the price is made in the 19:00&ndash;21:00 ramp. The offer cap and value of lost
        load are $5,000/MWh against a &minus;$251/MWh floor.
      </p>
      <p>
        Reserves are co-optimised with energy, because{" "}
        <a href="https://www.ercot.com/news/release/12052025-ercot-goes-live">
          Real-Time Co-optimisation plus Batteries went live on 5 December 2025
        </a>
        . That retired the separate ORDC price adders &mdash; RTORPA and its siblings no longer
        exist &mdash; and scarcity now reaches the energy price through the ancillary service demand
        curves inside SCED, with the LMP carrying the opportunity cost of holding reserves.
      </p>
      <p>
        The eight-bus network is <i>not</i> ERCOT&rsquo;s. ERCOT publishes prices for{" "}
        <a href="https://docs.gridstatus.io/data-guides">more than 18,000 electrical buses</a> and
        does not publish a reduced equivalent. The bus split of the fleet, the reactances, the line
        ratings, the GTC limits and the cost stack are a stylised reduction chosen to reproduce
        ERCOT&rsquo;s characteristic behaviour &mdash; West and Panhandle export congestion in
        surplus hours, an evening net-load ramp in summer &mdash; not to reproduce any particular
        hour. Treat levels as indicative and directions as the finding.
      </p>

      <h2>base power, for scale</h2>
      <p>
        The two left-hand marks on the slider are Base&rsquo;s actual position, as best as public
        reporting pins it down. Figures are the company&rsquo;s own or its utility partners&rsquo;,
        and deployment is moving fast enough that anything here is stale within a quarter.
      </p>
      <ul>
        <li>
          <b>Fleet in the ground:</b> over 500 MWh across Texas and Illinois as of mid-2026, up from
          roughly 300 MWh in March 2026 and about 100 MWh in late 2025. At 25 kWh a home that is on
          the order of 20,000 homes; Canary Media counted about 17,000 homes with systems installed
          around the same time.
        </li>
        <li>
          <b>Install pace:</b> roughly 100 batteries a day in mid-2026, which the company hoped to
          double by year end. Earlier reporting put it at 20 MW of capacity a month in late 2025,
          targeting 100 MW a month.
        </li>
        <li>
          <b>Contracted but not yet built:</b> more than 200 MW across utility programmes &mdash; a{" "}
          <a href="https://www.canarymedia.com/articles/batteries/base-power-to-launch-100-mw-home-battery-network-for-texas-utility">
            100 MW network with CoServ
          </a>{" "}
          in North Texas, its largest to date, plus El Paso Electric, Austin Energy and GVEC.
        </li>
        <li>
          <b>Hardware:</b> the Gen 1 unit is 11.4 kW / 25 kWh, or 50 kWh doubled up. The{" "}
          <a href="https://www.solarpowerworldonline.com/2026/08/base-power-begins-manufacturing-39-2-kwh-residential-battery-in-texas/">
            Base Core
          </a>{" "}
          launched in August 2026 at 39.2 kWh (78.4 kWh doubled), LFP, built in Austin at thousands
          of units a month.
        </li>
        <li>
          <b>Capital:</b> a $1B raise at a reported $13B valuation, funding the move into
          manufacturing and out of Texas.
        </li>
        <li>
          <b>Market access:</b> ERCOT&rsquo;s ADER pilot, whose registered-capacity limit ERCOT
          raised to 500 MW system-wide in March 2026, with the single-QSE share raised from 50% to
          90%. That cap is the binding constraint on nodal participation today, not the hardware.
        </li>
      </ul>
      <p>
        Put against the model: 20,000 homes is about 0.23 GW and half a GWh, which is a rounding
        error next to the 14 GW of grid-scale batteries already on ERCOT. The signed programmes
        roughly double it. The interesting part of the slider starts about two orders of magnitude
        to the right of where the company actually is.
      </p>

      <h2>what it leaves out</h2>
      <ul>
        <li>
          <b>Ancillary revenue.</b> Reserves shape the energy price here but the fleet is not paid
          for them, and in today&rsquo;s ERCOT that is a large share of what a battery earns. Every
          value on this page is a floor. It is also location-neutral, which is why omitting it does
          not move the siting ranking.
        </li>
        <li>
          <b>Distribution.</b> Feeder and transformer limits appear in no LMP. A neighbourhood of
          batteries charging together is a problem the wholesale price has no way to express, and it
          binds long before the transmission system notices.
        </li>
        <li>
          <b>Multi-day events.</b> Every day is solved on its own with a cyclic state of charge. A
          25 kWh home battery is a four-to-five hour asset: it answers an evening ramp and does not
          answer a three-day freeze. The winter day is the first night of such an event, not the
          third.
        </li>
        <li>
          <b>Market power, unit commitment, forecast error, congestion revenue rights,</b> and the
          4CP transmission cost allocation that a fleet this size would visibly distort.
        </li>
      </ul>
      <p className="colophon">
        prices from a linear program are step functions of quantity, so a small move on the slider
        can leave the price flat and the next one can jump it a whole block. that is marginal-cost
        pricing, not an artefact.
      </p>

      <Link href="/" className="back">
        ← back home
      </Link>
    </main>
  );
}
