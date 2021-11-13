# Map design

## Design format (.map.png)

A map is a colour bitmap with a defined palette:

| Colour | Definition | Area? | Required |
| --- | --- | --- | --- |
| Black `#ff000000` | Impassable terrain | ✓ | ✓ |
| Transparent `#00000000` | Playable area | ✓ | ✓ |
| Green `#ff00ff00` | Start point | ✗ | ✓ |
| Yellow `#ffffff00` | Look at start point | ✗ | ✓ |
| Blue `#ff0000ff` | Navigation breadcrumb | ✗ | ✓ |
| Red `#ffff0000` | Finish zone | ✓ | ✓ |

Guidelines:

 - The playable area should be reasonably convex, with no tricky small-scale roughness to get stuck in.
 - Edges of the map should be covered with terrain.
 - There must be a 1 pixel wide route between start and finish zone.
 - The straight line between breadcrumbs should be well within the playable area, as this is the route the NPC leader will follow.
 - Breadcrumbs should extend into the finish zone.
 - Breadcrumbs describe a route using this simple greedy chaining rule:
    - Begin at the start point, iteratively pick the next fresh breadcrumb (by Euclidean distance), until all have been used.

Tips:

 - On GIMP: add alpha channel, apply colour to alpha, use pencil not paintbrush.

## Final format (.map.json)

Before they are used by the game, the maps are preprocessed into this json format:

```json
{
    "width": 128,
    "height": 128,
    "start": [26, 18],
    "start_bearing": 0.0,
    "breadcrumbs": [[25, 34], [28, 91], [107, 103]],
    "cells": [1, 1, 1, 1, 0, 0, 0, 0, 2, 2, ...],
}
```

This is reasonably self-explanatory, but note:

 - `cell == 0` means playable area, `1` is terrain, `2` is finish zone.
