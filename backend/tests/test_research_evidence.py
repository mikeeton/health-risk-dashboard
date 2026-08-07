import pytest
from fastapi import HTTPException

from routes.research import sus_score


def test_sus_scoring_uses_standard_alternating_formula():
    assert sus_score([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]) == 100
    assert sus_score([3] * 10) == 50


def test_sus_rejects_incomplete_or_out_of_range_responses():
    with pytest.raises(HTTPException):
        sus_score([3] * 9)
    with pytest.raises(HTTPException):
        sus_score([6] * 10)
