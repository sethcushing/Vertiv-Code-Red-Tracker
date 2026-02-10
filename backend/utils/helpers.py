def calculate_kpi_progress(kpi: dict) -> float:
    """Calculate progress percentage for a KPI"""
    current = kpi.get("current_value")
    target = kpi.get("target_value")
    baseline = kpi.get("baseline_value", current)
    direction = kpi.get("direction", "increase")
    
    if current is None or target is None:
        return 0
    
    if baseline is None:
        baseline = current
    
    if direction == "increase":
        # Higher is better (e.g., 70% -> 95%)
        if target == baseline:
            return 100 if current >= target else 0
        progress = ((current - baseline) / (target - baseline)) * 100
    else:
        # Lower is better (e.g., 3 weeks -> 2 days)
        if baseline == target:
            return 100 if current <= target else 0
        progress = ((baseline - current) / (baseline - target)) * 100
    
    return max(0, min(100, progress))
