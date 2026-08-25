"""
Warehouse Space Optimizer — First Fit Decreasing (FFD) Bin Packing.
==================================================================
Allocates cargo items to warehouse racks using a greedy bin-packing
approach.  Items are sorted by total volume (largest first), then
assigned to the first rack that has sufficient remaining capacity.

Volume estimates per unit by size category (in cubic metres):
  - small  : 0.125 m³  (0.5 × 0.5 × 0.5)
  - medium : 0.50  m³  (1.0 × 1.0 × 0.5)
  - large  : 1.50  m³  (1.5 × 1.0 × 1.0)

Zone assignment by total weight of the item batch:
  - Heavy Load  : total_weight >= 500 kg
  - Medium Load : total_weight >= 100 kg
  - Light Load  : total_weight <  100 kg
"""

from __future__ import annotations

from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# Volume look-up per unit (m³)
# ---------------------------------------------------------------------------
UNIT_VOLUME_M3: dict[str, float] = {
    "small": 0.125,    # 50 cm × 50 cm × 50 cm
    "medium": 0.50,    # 100 cm × 100 cm × 50 cm
    "large": 1.50,     # 150 cm × 100 cm × 100 cm
}

# Max usable fraction of total warehouse volume (accounting for aisles, etc.)
USABLE_FRACTION = 0.80
    
# Capacity of a single rack in m³ (standard pallet rack ≈ 3 m³)
RACK_CAPACITY_M3 = 3.0


@dataclass
class RackSlot:
    """Represents a single rack with remaining capacity."""

    rack_id: str
    block: str
    remaining_m3: float = RACK_CAPACITY_M3
    items: list[str] = field(default_factory=list)


@dataclass
class AllocationResult:
    """Result of the bin-packing allocation."""

    allocations: list[dict]     # [{item, qty, assigned_rack, zone}, ...]
    space_utilization_pct: float
    total_racks_used: int
    remaining_capacity_pct: float
    rack_grid: list[list[dict]]


# ---------------------------------------------------------------------------
# Zone helpers
# ---------------------------------------------------------------------------

def _weight_zone(unit_weight_kg: float) -> str:
    """Assign a zone label based on the unit weight of an item."""
    if unit_weight_kg >= 50:
        return "Heavy Load"
    if unit_weight_kg >= 15:
        return "Medium Load"
    return "Light Load"


def _block_label(index: int) -> str:
    """Generate a block letter from a zero-based index (0→A, 1→B, ...)."""
    return chr(ord("A") + (index % 26))


# ---------------------------------------------------------------------------
# FFD Bin Packing
# ---------------------------------------------------------------------------

def allocate_warehouse(
    warehouse_volume_m3: float,
    items: list[dict],
) -> AllocationResult:
    """
    Allocate items to racks using First Fit Decreasing (FFD) based on unit volume.
    """
    usable_volume = warehouse_volume_m3 * USABLE_FRACTION
    max_racks = max(1, int(usable_volume / RACK_CAPACITY_M3))

    # --- Prepare item batches ---
    batches: list[dict] = []
    for item in items:
        unit_vol = UNIT_VOLUME_M3.get(item["size"], 0.125)
        batches.append({
            "name": item["name"],
            "qty": int(item["qty"]),
            "unit_vol_m3": unit_vol,
            "weight_kg": float(item["weight_kg"]),
            "zone": _weight_zone(float(item["weight_kg"])),
        })

    # Sort by unit volume descending (FFD strategy)
    batches.sort(key=lambda b: b["unit_vol_m3"], reverse=True)

    racks: list[RackSlot] = []
    allocations: list[dict] = []

    for batch in batches:
        remaining_qty = batch["qty"]
        unit_vol = batch["unit_vol_m3"]
        
        while remaining_qty > 0:
            placed = False
            
            # Try to fit into existing racks
            for rack in racks:
                if rack.remaining_m3 >= unit_vol:
                    fit_qty = min(remaining_qty, int(rack.remaining_m3 // unit_vol))
                    if fit_qty == 0: continue
                    
                    rack.remaining_m3 -= (fit_qty * unit_vol)
                    allocations.append({
                        "item": batch["name"],
                        "qty": fit_qty,
                        "assigned_rack": rack.rack_id,
                        "zone": batch["zone"],
                    })
                    remaining_qty -= fit_qty
                    placed = True
                    break
            
            # If no existing rack fits, create a new one
            if not placed:
                if len(racks) >= max_racks:
                    # Warehouse full, force fit remaining for demo purposes
                    # In a real system, we'd reject or queue them
                    idx = len(racks)
                    block = _block_label(idx)
                    new_rack = RackSlot(rack_id=f"Rack-{idx + 1} (Blok {block})", block=block)
                    fit_qty = remaining_qty
                    new_rack.remaining_m3 = 0
                    racks.append(new_rack)
                    allocations.append({
                        "item": batch["name"],
                        "qty": fit_qty,
                        "assigned_rack": new_rack.rack_id,
                        "zone": batch["zone"],
                    })
                    remaining_qty -= fit_qty
                    break
                else:
                    idx = len(racks)
                    block = _block_label(idx)
                    new_rack = RackSlot(rack_id=f"Rack-{idx + 1} (Blok {block})", block=block)
                    
                    fit_qty = min(remaining_qty, int(new_rack.remaining_m3 // unit_vol))
                    if fit_qty == 0: 
                        fit_qty = 1 # Force fit if item is larger than rack capacity
                    
                    new_rack.remaining_m3 -= (fit_qty * unit_vol)
                    racks.append(new_rack)
                    allocations.append({
                        "item": batch["name"],
                        "qty": fit_qty,
                        "assigned_rack": new_rack.rack_id,
                        "zone": batch["zone"],
                    })
                    remaining_qty -= fit_qty

    # --- Calculate utilisation metrics ---
    total_item_volume = sum(b["unit_vol_m3"] * b["qty"] for b in batches)
    utilization_pct = min(
        round((total_item_volume / usable_volume) * 100, 2) if usable_volume > 0 else 0.0,
        100.0,
    )
    remaining_pct = round(100.0 - utilization_pct, 2)

    # --- Spatial Rack Mapping (Grid 2D) ---
    import math
    # Render the full warehouse grid (including empty space) for accurate visual representation
    actual_racks = max(max_racks, len(racks))
    cols = max(1, math.ceil(math.sqrt(actual_racks)))
    rows = math.ceil(actual_racks / cols) if actual_racks > 0 else 1
    total_cells = rows * cols
    
    # Categorize populated racks based on highest priority zone
    rack_zones = {}
    for alloc in allocations:
        r_id = alloc["assigned_rack"]
        z = alloc["zone"]
        if z == "Heavy Load":
            rack_zones[r_id] = "heavy_zone"
        elif z == "Medium Load" and rack_zones.get(r_id) != "heavy_zone":
            rack_zones[r_id] = "standard"
        elif z == "Light Load" and r_id not in rack_zones:
            rack_zones[r_id] = "fast_dispatch"
            
    fast_racks = [r for r, z in rack_zones.items() if z == "fast_dispatch"]
    std_racks = [r for r, z in rack_zones.items() if z == "standard"]
    heavy_racks = [r for r, z in rack_zones.items() if z == "heavy_zone"]
    
    # Convert flat list to 2D grid, but only populate up to actual_racks
    flat_grid = [{"id": "empty", "zone": "empty"}] * total_cells
    
    front_idx = 0
    for r_id in fast_racks:
        if front_idx < actual_racks:
            flat_grid[front_idx] = {"id": r_id, "zone": "fast_dispatch"}
            front_idx += 1
            
    for r_id in std_racks:
        if front_idx < actual_racks:
            flat_grid[front_idx] = {"id": r_id, "zone": "standard"}
            front_idx += 1
            
    # Place heavy at the back of actual_racks (not total_cells)
    back_idx = actual_racks - 1
    for r_id in heavy_racks:
        if back_idx >= front_idx:
            flat_grid[back_idx] = {"id": r_id, "zone": "heavy_zone"}
            back_idx -= 1
            
    # Convert flat list to 2D grid
    rack_grid = []
    for r in range(rows):
        start = r * cols
        rack_grid.append(flat_grid[start:start+cols])

    return AllocationResult(
        allocations=allocations,
        space_utilization_pct=utilization_pct,
        total_racks_used=len(racks),
        remaining_capacity_pct=remaining_pct,
        rack_grid=rack_grid,
    )
