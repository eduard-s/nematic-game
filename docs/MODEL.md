# Model and limits

This project provides an illustrative 2D material model.
It does not calculate an equilibrium phase diagram or reaction chemistry.
The values use relative scales.
Distances and speeds use simulation pixels.
The model supports play and explanation, rather than quantitative predictions for a real material.

Liquid mode has independent rod orientations and free positions.
Nematic mode adds apolar orientational coupling.
Solid mode uses spring-bound lattice sites.
Heat increases random motion and softens the lattice springs.
A structure change preserves the other parameters.

Uniform electric and in-plane magnetic fields apply signed apolar torque to neutral rods.
An electric field also moves charged ions.
A magnetic field through the plane bends charged paths.
The magnetic velocity update preserves kinetic energy before drag, noise, and other forces.
Ion forces use softened electrostatics and optional screening.

Stir, Swirl, and Pull apply local forces.
Comb changes local orientations.
The crossed-polarizer display uses a qualitative orientation filter.
It is not a full optical calculation.

The model omits solvent dynamics, hydrodynamic flow, molecular chemistry, and material-specific constants.
The sample has finite boundaries and a capped particle count.
The frame cost depends on the host device and browser.
The automatic frame limit helps control the cost.
