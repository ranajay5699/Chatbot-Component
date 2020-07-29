import React from 'react';
import {
  Card, CardImg, CardText, CardBody,
  CardTitle, CardSubtitle, Button
} from 'reactstrap';

const ResponseCard = (props) => {
    console.log(props.buttons)
    const buttons = props.buttons.map((m,i) => {
        return (<Button>m.text</Button>);
    });
    return (
        <div>
        <Card>
            <CardImg top width="100%" src={props.imageUrl} />
            <CardBody>
                <CardTitle>{props.title}</CardTitle>
                <CardSubtitle>{props.subtitle}</CardSubtitle>
                {buttons}
            </CardBody>
        </Card>
        </div>
    );
};

export default ResponseCard;