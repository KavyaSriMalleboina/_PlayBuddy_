import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "../services/api";

import "../styles/ReviewsSection.css";


function ReviewsSection({ playerId }) {

    const [reviews, setReviews] = useState([]);

    const [eligibility, setEligibility] = useState(null);

    const [comment, setComment] = useState("");

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const [message, setMessage] = useState("");

    const [submitting, setSubmitting] = useState(false);


    // -----------------------------------------
    // FETCH REVIEWS AND ELIGIBILITY
    // -----------------------------------------

    const fetchReviews = useCallback(async () => {

        setLoading(true);
        setError("");

        try {

            const [reviewsRes, eligibilityRes] = await Promise.all([

                apiFetch(`reviews/${playerId}`),

                apiFetch(`reviews/${playerId}/eligibility`)

            ]);

            const reviewsData = await reviewsRes.json();

            const eligibilityData = await eligibilityRes.json();

            if (!reviewsRes.ok || !eligibilityRes.ok) {
                throw new Error(
                    reviewsData.detail ||
                    eligibilityData.detail ||
                    "Unable to load reviews"
                );
            }

            setReviews(reviewsData.reviews || []);

            setEligibility(eligibilityData);

        } catch (err) {

            setError(err.message);

        } finally {

            setLoading(false);

        }

    }, [playerId]);


    useEffect(() => {

        fetchReviews();

    }, [fetchReviews]);


    // -----------------------------------------
    // SUBMIT REVIEW
    // -----------------------------------------

    const submitReview = async (e) => {

        e.preventDefault();

        setError("");
        setMessage("");

        if (!comment.trim()) {
            setError("Please write a review");
            return;
        }

        setSubmitting(true);

        try {

            const response = await apiFetch(
                `reviews/${playerId}`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        comment: comment.trim()
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail || "Unable to submit review"
                );
            }

            setComment("");

            setMessage("Review submitted successfully");

            await fetchReviews();

        } catch (err) {

            setError(err.message);

        } finally {

            setSubmitting(false);

        }

    };


    // -----------------------------------------
    // DELETE REVIEW
    // -----------------------------------------

    const deleteReview = async (reviewId) => {

        const confirmed = window.confirm(
            "Are you sure you want to delete your review?"
        );

        if (!confirmed) return;

        setError("");
        setMessage("");

        try {

            const response = await apiFetch(
                `reviews/${reviewId}`,
                {
                    method: "DELETE"
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail || "Unable to delete review"
                );
            }

            setMessage("Review deleted successfully");

            await fetchReviews();

        } catch (err) {

            setError(err.message);

        }

    };


    if (loading) {
        return <p>Loading reviews...</p>;
    }


    return (

        <section className="reviews-section">

            <div className="reviews-header">

                <h2>Player Reviews</h2>

                <span>
                    {reviews.length} reviews
                </span>

            </div>


            {error && (
                <p className="review-error">
                    {error}
                </p>
            )}

            {message && (
                <p className="review-success">
                    {message}
                </p>
            )}


            {/* REVIEW FORM */}

            {eligibility?.can_review && (

                <form
                    className="review-form"
                    onSubmit={submitReview}
                >

                    <h3>Write a review</h3>

                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Share your experience playing together..."
                        maxLength={1000}
                        minLength={5}
                        required
                    />

                    <div className="review-form-footer">

                        <span>
                            {comment.length}/1000
                        </span>

                        <button
                            type="submit"
                            disabled={submitting}
                        >
                            {submitting
                                ? "Submitting..."
                                : "Submit Review"
                            }
                        </button>

                    </div>

                </form>

            )}


            {/* EXISTING REVIEW */}

            {eligibility?.has_review && (

                <p className="review-info">
                    You have already reviewed this player.
                    You can delete your review and submit a new one.
                </p>

            )}


            {/* NOT ELIGIBLE */}

            {!eligibility?.eligible && !eligibility?.has_review && (

                <p className="review-info">
                    You need at least one completed meetup together
                    before reviewing this player.
                </p>

            )}


            {/* REVIEW LIST */}

            <div className="reviews-list">

                {reviews.length === 0 ? (

                    <p className="no-reviews">
                        No reviews yet.
                    </p>

                ) : (

                    reviews.map((review) => (

                        <article
                            className="review-card"
                            key={review.id}
                        >

                            <div className="review-card-header">

                                <h4>
                                    {review.reviewer_name}
                                </h4>

                                {review.reviewer_id === eligibility?.current_user_id && (
                                    <button
                                        type="button"
                                        className="delete-review-btn"
                                        onClick={() => deleteReview(review.id)}
                                    >
                                        Delete
                                    </button>
                                )}

                            </div>

                            <p className="review-comment">
                                {review.comment}
                            </p>

                            <span className={`review-sentiment ${review.sentiment}`}>
                                {review.sentiment}
                            </span>

                        </article>

                    ))

                )}

            </div>

        </section>

    );

}

export default ReviewsSection;