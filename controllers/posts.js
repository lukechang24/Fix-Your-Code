const express = require("express");
const router = express.Router();

const Post = require("../models/posts")
const User = require("../models/users")
const Comment = require("../models/comments")

router.get("/", async (req, res) => {
    try {
        const posts = await Post.find({});
        res.render("posts/index", {
            user: req.session.currentUser,
            posts: posts.reverse(),
        });
    } catch(err) {
        console.log(err);
    }
})

router.get("/new", (req, res) => {
    if(req.session.currentUser.username) {
        res.render("posts/new", {
            message: ""
        });
    } else {
        req.session.previousURL = `/posts/new`;
        res.render("auth/login", {
            message: "You must be logged in to create a post"
        });
    }
})

router.get("/:id/edit", async (req, res) => {
    const post = await Post.findOne({_id: req.params.id});
    const currentUser = await User.findOne({username: req.session.currentUser.username}) || {};
    const comments = await Comment.find({postID: req.params.id});
    res.render("posts/edit", {
        post,
        currentUser,
        comments
    })
})

router.put("/:id", async (req, res) => {
    const post = await Post.findByIdAndUpdate(req.params.id, req.body);
    res.redirect(`/posts/${req.params.id}`);
})

router.post("/", async (req, res) => {
    try {
        if(!req.body.title || !req.body.description || !req.body.body) {
            res.render("posts/new", {
                message: `${((!req.body.title && !req.body.description) || (!req.body.title && !req.body.body) || (!req.body.description && !req.body.body)) ? "Please specifiy your post further!" : !req.body.title ? "Please make a title for your post" : !req.body.description ? "Please describe your broken code" : "Please paste your broken code"}`
            })
        } else {
            req.body.creator = {username: req.session.currentUser.username, displayName: req.session.currentUser.displayName, userID: req.session.currentUser.userID};
            const post = await Post.create(req.body);
            // const user = await User.findOne({username: req.session.currentUser.username});
            // user.posts.push(post);
            // user.save();
            res.redirect(`/posts/${post._id}`);
        }
    }catch (err) {
        console.log(err);   
    }
})

router.post("/:id/comment", async (req, res) => {
    try {
        if(!req.body.comment) {
            res.redirect(`/posts/${req.params.id}`);
        } else if(req.session.currentUser.username) {
            const comment = await Comment.create({postID: req.params.id, creator: {displayName: req.session.currentUser.displayName, userID: req.session.currentUser.userID, username: req.session.currentUser.username}, comment: req.body.comment});
            comment.likedBy.push(req.session.currentUser.userID);
            comment.save();
            const post = await Post.findOneAndUpdate({_id: comment.postID}, {$push: {comments: comment}});
            res.redirect(`/posts/${req.params.id}`);
        } else {
            req.session.previousURL = `/posts/${req.params.id}`;
            res.render("auth/login", {
                message: "You must be logged in to comment",
                currentComment: req.body.comment
            });
        }
    } catch(err) {
        console.log(err);
    }
})

router.post("/:id/:commentID/like", async (req, res) => {
    try {
        if(req.session.currentUser.username) {
            const likeComment = await Comment.findOneAndUpdate({_id: req.params.commentID, likedBy: {$ne: req.session.currentUser.userID}}, {$push: {likedBy: req.session.currentUser.userID}});
            if(!likeComment) {
                const dislikeComment = await Comment.findByIdAndUpdate(req.params.commentID, {$pull: {likedBy: req.session.currentUser.userID}})
            }
            res.redirect(`/posts/${req.params.id}`);
        } else {
            req.session.previousURL = req.headers.referer;
            res.render("auth/login", {
                message: "You must be logged in to like comments",
            });
        }
    } catch(err) {
        console.log(err);
    }
})

router.get("/:id", async (req, res) => {
    try {
        const post = await Post.findOne({_id: req.params.id});
        const currentUser = await User.findOne({username: req.session.currentUser.username}) || {};
        let comments = await Comment.find({postID: req.params.id});
        let sortedComments = [...comments];
        sortedComments = sortedComments.sort((a, b) => b.likedBy.length - a.likedBy.length).filter(comment => {
            return comment.likedBy.length > 2;
        })
        const restOfComments = comments.filter(comment => {
            return !sortedComments.slice(0, 3).includes(comment) || comment.likedBy.length < 3;
        }).reverse();
        console.log(sortedComments);
        comments = sortedComments.slice(0, 3).concat(restOfComments);
        res.render("posts/show", {
            post,
            currentUser,
            comments,
            sortedComments: sortedComments.splice(0, 3),
            session: req.session
        })
    } catch(err) {
        console.log(err)
    }
})

router.delete("/:id/:commentID", async (req, res) => {
    try {
        const deletedComment = await Comment.findByIdAndRemove(req.params.commentID);
        const post = await Post.findById(req.params.id);
        post.comments = post.comments.filter(comment => {
            return comment._id.toString() !== deletedComment._id.toString();
        })
        post.save();
        res.redirect(`/posts/${req.params.id}`);
    } catch(err) {
        console.log(err);
    }
})

router.delete("/:id", async (req, res) => {
    try {
        // const user = await User.findOneAndUpdate({_id: post.creator._id}, {$pull: {posts: req.params.id}});
        const post = await Post.findOneAndDelete({_id: req.params.id});
        // const comments = await Comment.deleteMany({postId: req.params.id});
        res.redirect("/posts");
    } catch(err) {
        console.log(err);
    }
})

module.exports = router;