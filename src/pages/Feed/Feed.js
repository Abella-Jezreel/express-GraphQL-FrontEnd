import React, { Component, Fragment } from "react";
import { withRouter } from "react-router-dom";
import Post from "../../components/Feed/Post/Post";
import Button from "../../components/Button/Button";
import FeedEdit from "../../components/Feed/FeedEdit/FeedEdit";
import Input from "../../components/Form/Input/Input";
import Paginator from "../../components/Paginator/Paginator";
import Loader from "../../components/Loader/Loader";
import ErrorHandler from "../../components/ErrorHandler/ErrorHandler";
import "./Feed.css";

class Feed extends Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: "",
    postPage: 1,
    postsLoading: true,
    editLoading: false,
  };

  componentDidMount() {
    const token = this.props.token || localStorage.getItem("token");
    if (token) {
      this.fetchUserStatus(token);
      this.loadPosts(token);
    } else {
      this.logoutHandler();
    }
  }

  logoutHandler = () => {
    this.setState({ isAuth: false, token: null });
    localStorage.removeItem("token");
    localStorage.removeItem("expiryDate");
    localStorage.removeItem("userId");
    this.props.history.push("/");
  };

  fetchUserStatus = (token) => {
    const graphqlQuery = {
      query: `
        {
          getUser {
            _id
            name
            status
          }
        }
      `,
    };
    fetch("http://localhost:8080/graphql", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphqlQuery),
    })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error("Failed to fetch user status.");
        }
        return res.json();
      })
      .then((resData) => {
        this.setState({ status: resData.data.getUser.status });
      })
      .catch(this.catchError);
  };

  loadPosts = (direction) => {
    const token = this.props.token || localStorage.getItem("token");
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    let page = this.state.postPage;
    if (direction === "next") {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === "previous") {
      page--;
      this.setState({ postPage: page });
    }

    const graphqlQuery = {
      query: `
        query GetPosts($page: Int!) {
          getPosts(page: $page) {
            posts {
              _id
              title
              content
              imageUrl
              creator {
                _id
                name
              }
              createdAt
            }
            totalPosts
          }
        }
      `,
      variables: {
        page: page,
      },
    };

    fetch("http://localhost:8080/graphql", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphqlQuery),
    })
      .then((resData) => {
        return resData.json();
      })
      .then((resData) => {
        if (resData.errors) {
          throw new Error("Fetching posts failed.");
        }
        console.log(resData, "getPosts");
        this.setState({
          posts: resData.data.getPosts.posts,
          totalPosts: resData.data.getPosts.totalPosts,
          imagePath: resData.data.getPosts.imageUrl,
          postsLoading: false,
        });
      })
      .catch(this.catchError);
  };

  statusUpdateHandler = (event) => {
    event.preventDefault();

    const graphqlQuery = {
      query: `
        mutation UpdateStatus($status: String!) {
          updateStatus(status: $status) {
            status
          }
        }
      `,
      variables: {
        status: this.state.status,
      },
    };

    fetch("http://localhost:8080/graphql", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.props.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphqlQuery),
    })
      .then((res) => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error("Can't update status!");
        }
        return res.json();
      })
      .then((resData) => {
        console.log(resData);
      })
      .catch(this.catchError);
  };

  newPostHandler = () => {
    this.setState({ isEditing: true });
  };

  startEditPostHandler = (postId) => {
    this.setState((prevState) => {
      const loadedPost = { ...prevState.posts.find((p) => p._id === postId) };

      return {
        isEditing: true,
        editPost: loadedPost,
      };
    });
  };

  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };

  finishEditHandler = (postData) => {
    const token = this.props.token || localStorage.getItem("token");
    this.setState({
      editLoading: true,
    });
    const formData = new FormData();
    formData.append("image", postData.image);
    if (this.state.editPost) {
      formData.append("oldPath", this.state.editPost.imagePath);
    }
    fetch("http://localhost:8080/post-image", {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + token,
      },
      body: formData,
    })
      .then((res) => res.json())
      .then((fileResData) => {
        const imageUrl = fileResData.filePath.replace(/\\/g, "/");
        let graphqlQuery;

        if (this.state.editPost && this.state.editPost._id) {
          graphqlQuery = {
            query: `
              mutation UpdatePost($postId: ID!, $postInput: PostInput!) {
                updatePost(postId: $postId, postInput: $postInput) {
                  _id
                  title
                  content
                  imageUrl
                  creator {
                    _id
                    name
                  }
                  createdAt
                }
              }
            `,
            variables: {
              postId: this.state.editPost._id,
              postInput: {
                title: postData.title,
                content: postData.content,
                imageUrl: imageUrl,
              },
            },
          };
        } else {
          // Create new post
          graphqlQuery = {
            query: `
              mutation CreatePost($postInput: PostInput!) {
                createPost(postInput: $postInput) {
                  _id
                  title
                  content
                  imageUrl
                  creator {
                    _id
                    name
                  }
                  createdAt
                }
              }
            `,
            variables: {
              postInput: {
                title: postData.title,
                content: postData.content,
                imageUrl: imageUrl,
              },
            },
          };
        }

        console.log("GraphQL Query:", graphqlQuery);

        return fetch("http://localhost:8080/graphql", {
          method: "POST",
          body: JSON.stringify(graphqlQuery),
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
        });
      })
      .then((res) => {
        return res.json();
      })
      .then((resData) => {
        console.log("GraphQL Response:", resData);
        if (resData.errors && resData.errors[0].status === 422) {
          throw new Error(
            "Validation failed. Make sure the email address isn't used yet!"
          );
        }
        if (resData.errors) {
          throw new Error("User login failed!");
        }
        let post;
        if (this.state.editPost && this.state.editPost._id) {
          post = resData.data.updatePost;
        } else {
          post = resData.data.createPost;
        }

        if (!post) {
          throw new Error("Post creation/update failed!");
        }

        console.log("Post Data:", post);

        const updatedPost = {
          _id: post._id,
          title: post.title,
          content: post.content,
          creator: post.creator,
          createdAt: post.createdAt,
          imagePath: post.imageUrl,
        };
        this.setState((prevState) => {
          let updatedPosts = [...prevState.posts];
          if (prevState.editPost) {
            const postIndex = prevState.posts.findIndex(
              (p) => p._id === prevState.editPost._id
            );
            updatedPosts[postIndex] = updatedPost;
          } else {
            updatedPosts.pop();
            updatedPosts.unshift(updatedPost);
          }
          return {
            posts: updatedPosts,
            isEditing: false,
            editPost: null,
            editLoading: false,
          };
        });
        this.loadPosts();
      })
      .catch((err) => {
        console.log(err);
        this.setState({
          isEditing: false,
          editPost: null,
          editLoading: false,
          error: err,
        });
      });
  };

  statusInputChangeHandler = (input, value) => {
    this.setState({ status: value });
  };

  deletePostHandler = (postId) => {
    console.log("Deleting post with ID:", postId);
    const graphqlQuery = {
      query: `
        mutation DeletePost($postId: ID!) {
          deletePost(postId: $postId)
        }
      `,
      variables: {
        postId: postId,
      },
    };
    this.setState({ postsLoading: true });
    fetch("http://localhost:8080/graphql", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.props.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphqlQuery),
    })
      .then((res) => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error("Deleting a post failed!");
        }
        return res.json();
      })
      .then((resData) => {
        console.log(resData);
        this.setState((prevState) => {
          const updatedPosts = prevState.posts.filter((p) => p._id !== postId);
          return { posts: updatedPosts, postsLoading: false };
        });
        this.loadPosts();
      })
      .catch((err) => {
        console.log(err);
        this.setState({ postsLoading: false });
      });
  };

  errorHandler = () => {
    this.setState({ error: null });
  };

  catchError = (error) => {
    this.setState({ error: error });
  };

  render() {
    return (
      <Fragment>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
        />
        <section className="feed__status">
          <form onSubmit={this.statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={this.statusInputChangeHandler}
              value={this.state.status}
            />
            <Button mode="flat" type="submit">
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={this.newPostHandler}>
            New Post
          </Button>
        </section>
        <section className="feed">
          {this.state.postsLoading && (
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <Loader />
            </div>
          )}
          {this.state.posts.length <= 0 && !this.state.postsLoading ? (
            <p style={{ textAlign: "center" }}>No posts found.</p>
          ) : null}
          {!this.state.postsLoading && (
            <Paginator
              onPrevious={this.loadPosts.bind(this, "previous")}
              onNext={this.loadPosts.bind(this, "next")}
              lastPage={Math.ceil(this.state.totalPosts / 2)}
              currentPage={this.state.postPage}
            >
              {this.state.posts.map((post, index) => (
                <Post
                  key={index}
                  id={post._id}
                  author={post.creator.name}
                  loginUserId={this.props.userId}
                  userId={post.creator._id}
                  date={new Date(post.createdAt).toLocaleDateString("en-US")}
                  title={post.title}
                  image={post.imageUrl}
                  content={post.content}
                  onStartEdit={this.startEditPostHandler.bind(this, post._id)}
                  onDelete={this.deletePostHandler.bind(this, post._id)}
                />
              ))}
            </Paginator>
          )}
        </section>
      </Fragment>
    );
  }
}

export default withRouter(Feed);
