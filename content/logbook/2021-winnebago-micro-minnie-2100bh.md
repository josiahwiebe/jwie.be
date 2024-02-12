---
title: Winnebago Micro Minnie 2100BH - Changelog
date: 2021-05-14
---

In the spirit of software development, I thought I'd keep a record of the changes and upgrades I make to our 2022 Winnebago Micro Minnie 2100BH – a sort of "release notes" if you will.

### 14 May 2021

Took delivery.

<Image src='/img/winnebago-micro-minnie/winnie-delivery.jpg' alt='New trailer setup on our driveway' />

### 17 May 2022

Received our Westinghouse iGen4500 Inverter Generator. This is a 4500W inverter generator that runs on gasoline. It's a bit larger than I would have liked, but it's the only one that can run the air conditioner. I have yet to discover that later upgrades will allow me to run the A/C off of a smaller generator.

<ImageWithCaption src='/img/winnebago-micro-minnie/generator.jpg' alt='Generator in rear storage compartment'>
  Test fitting the generator in the rear storage compartment
</ImageWithCaption>

### 26 May 2021

Installed [this rear camera](https://a.co/d/7bFckYf) on the back of the trailer. Easily tied into the running lights of the trailer for power.

### 27 May 2021

Our first trip with the camper. We took it to Falcon Lake, Manitoba for a long weekend.

<div class='image-half'>
  <ImageWithCaption
    src='/img/winnebago-micro-minnie/winnie-first-trip.jpg'
    alt='Prepared to depart for our inaugural trip'>
    Ready for our maiden voyage!
  </ImageWithCaption>
  <ImageWithCaption src='/img/winnebago-micro-minnie/winnie-falcon.jpg' alt='Camper at Falcon Lake Beach Campground'>
    Setup at [Falcon Lake Beach Campground](https://www.travelmanitoba.com/directory/falcon-beach-campground/)
  </ImageWithCaption>
</div>

### 3 Feb 2022 - Memory Foam Mattress

Replaced the mattress with [this one](https://a.co/d/3J3dP5c).

### 17 April 2022 - Lithium Battery

Purchased a [Renogy 200aH Smart Lithium battery](https://ca.renogy.com/200ah-12-volt-lithium-iron-phosphate-battery-w-bluetooth/), with no real plan for how to implement it yet.

### 10 May 2022 - 2000W Inverter

Acquired a [Xantrex Freedom XC 2000W Pure Sine Wave Inverter](https://xantrex.com/products/inverter-chargers/freedomxc/). Still planning on the right battery configuration as well as how to wire it up.

### 15 June 2022 - Inverter & Battery Install

Dry mounted the inverter and battery in the rear storage compartment. With the help of my very knowledgeable coworker Brian, we sketched out a few scenarios and landed on this one.

<Image
  src='/img/winnebago-micro-minnie/winnie-inverter-plan.jpg'
  alt='A sketch showing the plan for installing the inverter'
/>

One of the challenges we had to overcome was the assumption by Winnebago that the battery would be mounted on the trailer tongue (standard on most travel trailers). We wanted to limit the interruption of the existing wiring as much as possible.

Looking at the [Winnie Owners forums](https://www.winnieowners.com/forums/), it seems that many folks decided to install their equipment in the pass through storage under the primary bed at the front. So we had two options:

1. Pass-through storage
   - Pro: closer to 12V distribution on tongue
   - Pro: shorter DC cable runs (less voltage drop)
   - Con: fan noise from inverter directly below primary bed
   - Con: takes up our most valuable storage area
   - Con: un-conditioned space
1. Rear storage
   - Pro: closer to 120V shore power input
   - Pro: inverter fan far from primary bed
   - Pro: conditioned space - can use in sub-zero temperatures
   - Con: long 12V DC cable run

In the end, we settled on the rear storage area. Using 2 AWG cable over a 13 metre cable run only results in a 1% voltage drop at 10 amps, well within acceptable range. We ended up using 4 AWG as there was no 2 AWG available, but even that resulted in only 1.65% voltage drop.

<ImageWithCaption
  src='/img/winnebago-micro-minnie/winnie-shore-power.jpg'
  alt='Showing how the shore power enters the RV'>
Shore power enters the trailer through the rear storage compartment.
</ImageWithCaption>

The Freedom XC has a pass-through mode, which will simply allow it to operate as a (relatively) neutral part of the circuit when plugged into shore power once the battery is fully charged. To accomplish this, we split the shore power wire where it entered the trailer and installed a junction box. From this box, we connected the shore power wire to the inverter IN, then ran a cable from the inverter OUT which connected inside the junction box to the wire we originally split (which continues on to our distribution and breaker panel).

<Image
  src='/img/winnebago-micro-minnie/inverter-final-install.jpg'
  alt='Final installation of the inverter and lithium battery'
/>

Here's what the final installation looks like. There's enough space to easily accommodate an additional 200aH battery beside this one, which could prove useful in the future.

### 13 July 2022- MicroAir Easy Start

Due to the nature of the way I installed the inverter, it allowed the entire trailer to run off of inverter power. That meant that every component that normally relied on 120V shore power would be able to run off of battery power, via the inverter.

One component I was really hoping to test was the air conditioner. Our summer had already been extremely hot, and we knew we would need the A/C as we headed west to the Okanagan. Theoretically, I should be able to run this air conditioner via the inverter (it's a GE 13k BTU ARC13AACBL), but I wanted to test it.

I acquired a MicroAir Easy Start (soft start capacitor) and set about installing it. Specifically, the [ASY-364-X36-BLUE](https://www.microair.net/collections/easystart-soft-starters/products/easystart-364-3-ton-single-phase-soft-starter-for-air-conditioners?variant=29181121483) model.

<Image
  src='/img/winnebago-micro-minnie/soft-start-install.jpg'
  alt='Installing the Easy Start under the air conditioner shround'
/>

After a few tests, I was able to successfully run the air conditioner off of battery power! It ran at about 5.5A, so that only gave me about 2 hours of run time, but that didn't matter. I simply wanted to be able to do it, and have the option available to me in a pinch.

<div class='image-half'>
  <ImageWithCaption src='/img/winnebago-micro-minnie/soft-start-status.png' alt='Screenshot of Easy Start app status'>
    The Easy Start app shows the current voltage and starting voltage of the A/C
  </ImageWithCaption>
  <ImageWithCaption src='/img/winnebago-micro-minnie/battery-status.png' alt='Screenshot of Renogy app'>
    The Renogy app shows the remaining battery capacity under load
  </ImageWithCaption>
</div>

### 10 August 2022 - IRVWPC

After seeing numerous installations of them at the LTV Quebec Rally in June, I was inspired to install my own [IRVWPC](https://www.irvwpc.com/). This allows my water pump to run virtually silently, without the usual knocking and banging you get from an RV pump.

Made in Canada, this control board sits between the 12V DC power supply and your water pump, and slowly ramps the supplied voltage up and down as a means to control the speed of the pump.

<Image src='/img/winnebago-micro-minnie/irvwpc-install.jpg' alt='The IRVWPC installed' />
