"""Dummy/example metric."""

import datetime
from typing import Text

from metrics import base
import models


class IdentityMetric(base.PercentageMetric):
  """A metric which reports the value it is initialized with."""

  def __init__(self, value: float):
    super(IdentityMetric, self).__init__()
    self._value = value

  def _score_value(self, percentage: float) -> models.MetricScore:
    if percentage < 0.2:
      return models.MetricScore.POOR
    elif percentage < 0.5:
      return models.MetricScore.MODERATE
    elif percentage < 0.8:
      return models.MetricScore.GOOD
    else:
      return models.MetricScore.EXCELLENT

  def _compute_value(self) -> models.MetricResult:
    return self._value
