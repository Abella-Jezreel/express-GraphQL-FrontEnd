import React, { Component } from "react";

import Image from "../../../components/Image/Image";
import "./SinglePost.css";
import image from "../../../components/Image/Image";

class SinglePost extends Component {
  state = {
    title: "",
    author: "",
    date: "",
    image: "",
    content: "",
  };

  componentDidMount() {
    const token = this.props.token || localStorage.getItem("token");
    if (!token) {
      this.props.history.push("/");
      return;
    }
    const postId = this.props.match.params.postId;
    const graphqlQuery = {
      query: `
        query GetPost($postId: ID!) {
          getPost(postId: $postId) {
            _id
            title
            content
            imageUrl
            creator {
              name
            }
            createdAt
          }
        }
      `,
      variables: {
        postId: postId,
      },
    };
    fetch(`http://localhost:8080/graphql`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.props.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphqlQuery),
    })
      .then((res) => {
        return res.json();
      })
      .then((resData) => {
        if (resData.errors) {
          throw new Error("Fetching Post failed!");
        }
        console.log(resData, "single post");
        this.setState({
          title: resData.data.getPost.title,
          author: resData.data.getPost.creator.name,
          image: `http://localhost:8080/${resData.data.getPost.imageUrl}`,
          date: new Date(resData.data.getPost.createdAt).toLocaleDateString(
            "en-US"
          ),
          content: resData.data.getPost.content,
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }

  render() {
    return (
      <section className="single-post">
        <h1>{this.state.title}</h1>
        <h2>
          Created by {this.state.author} on {this.state.date}
        </h2>
        <div className="single-post__image">
          <Image contain imageUrl={`${this.state.image}`} />
        </div>
        <p>{this.state.content}</p>
      </section>
    );
  }
}

export default SinglePost;
