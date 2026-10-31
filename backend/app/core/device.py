from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def is_cuda_available() -> bool:
    """Returns True if PyTorch has CUDA support and an NVIDIA GPU is detected."""
    try:
        import torch

        return bool(torch.cuda.is_available() and torch.cuda.device_count() > 0)
    except Exception:
        return False


def get_optimal_device() -> str:
    """Returns 'cuda' if GPU acceleration is available, otherwise 'cpu'."""
    return "cuda" if is_cuda_available() else "cpu"


def get_device_name() -> str:
    """Returns the descriptive name of the active device (e.g. GPU model or CPU)."""
    if is_cuda_available():
        try:
            import torch

            return str(torch.cuda.get_device_name(0))
        except Exception:
            return "NVIDIA CUDA GPU"
    return "CPU"


def get_system_hardware_info() -> dict[str, Any]:
    """Returns a full hardware and acceleration report."""
    cuda_ok = is_cuda_available()
    device = "cuda" if cuda_ok else "cpu"
    name = get_device_name()

    info: dict[str, Any] = {
        "device": device,
        "device_name": name,
        "cuda_available": cuda_ok,
        "acceleration_mode": f"GPU ({name})" if cuda_ok else "CPU (Fallback)",
    }

    try:
        import torch

        info["torch_version"] = torch.__version__
        if cuda_ok:
            props = torch.cuda.get_device_properties(0)
            total_mb = round(props.total_memory / (1024 * 1024))
            allocated_mb = round(torch.cuda.memory_allocated(0) / (1024 * 1024))
            reserved_mb = round(torch.cuda.memory_reserved(0) / (1024 * 1024))
            free_mb = max(0, total_mb - reserved_mb)

            info.update(
                {
                    "device_count": torch.cuda.device_count(),
                    "vram_total_mb": total_mb,
                    "vram_allocated_mb": allocated_mb,
                    "vram_free_mb": free_mb,
                    "compute_capability": f"{props.major}.{props.minor}",
                }
            )
    except Exception as exc:
        logger.debug("Could not inspect PyTorch device properties: %s", exc)

    return info
